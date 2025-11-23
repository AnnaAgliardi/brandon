import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-helpers'
import { generateEmbedding } from '@/lib/openai'
import { queryVectors } from '@/lib/pinecone'
import { generateChatResponse } from '@/lib/gemini'
import { ChatRequestSchema, BrandonAsset } from '@/lib/types'
import { checkRateLimit, isRateLimited, getRateLimitHeaders } from '@/lib/rate-limit'

// Helper to create SSE response
function createSSEResponse() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
    },
  })

  function send(event: { type: string; data?: any }) {
    const message = `data: ${JSON.stringify(event)}\n\n`
    controller.enqueue(encoder.encode(message))
  }

  function close() {
    controller.close()
  }

  return { stream, send, close }
}

export async function POST(request: NextRequest) {
  const { stream, send, close } = createSSEResponse()

  // Process the request asynchronously
  processRequest(request, send, close).catch((error) => {
    console.error('Error processing request:', error)
    send({
      type: 'error',
      data: { error: error.message || 'Internal server error' },
    })
    close()
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function processRequest(
  request: NextRequest,
  send: (event: any) => void,
  close: () => void
) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      send({ type: 'error', data: { error: 'Unauthorized' } })
      close()
      return
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Authenticate user
    const user = await requireAuth(supabase)

    // Rate limiting
    const rateLimitInfo = checkRateLimit(user.id)
    if (isRateLimited(rateLimitInfo)) {
      send({
        type: 'error',
        data: {
          error: 'Rate limit exceeded',
          reset: new Date(rateLimitInfo.reset).toISOString(),
        },
      })
      close()
      return
    }

    // Parse and validate request
    const body = await request.json()
    // We manually extract session_id since it's not in ChatRequestSchema yet or we need to update schema
    // For now, let's trust the body structure or update schema later.
    // Let's assume body has messages and optional session_id
    const { messages, session_id } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      send({ type: 'error', data: { error: 'No messages provided' } })
      close()
      return
    }

    const lastMessage = messages[messages.length - 1]
    const userMessageContent = lastMessage.content

    // Handle Session
    let currentSessionId = session_id
    let isNewSession = false

    if (!currentSessionId) {
      // Create new session if none provided
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: userMessageContent.slice(0, 30) + (userMessageContent.length > 30 ? '...' : ''), // Initial title from first message
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      currentSessionId = newSession.id
      isNewSession = true
    } else {
      // Update existing session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentSessionId)
    }

    // Send session ID to client immediately
    send({ type: 'session', data: { session_id: currentSessionId } })

    // Save User Message
    const { error: msgError } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      session_id: currentSessionId, // Link to session
      role: 'user',
      content: userMessageContent,
    })

    if (msgError) throw msgError

    // Send status: Analyzing query
    send({ type: 'status', data: { status: 'Analyzing your query...' } })

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(userMessageContent)

    // Get total asset count
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { count: totalAssets } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    // Send status: Searching
    send({
      type: 'status',
      data: {
        status: `Searching through ${totalAssets?.toLocaleString() || 0} assets...`,
      },
    })

    // Generate Embedding & Search
    const pineconeResults = await queryVectors(queryEmbedding, 30, { status: 'approved' })

    // Send status: Found matches
    send({
      type: 'status',
      data: { status: `Found ${pineconeResults.length} potential matches` },
    })

    // Send status: Ranking
    send({
      type: 'status',
      data: { status: 'Ranking by relevance and recency...' },
    })

    // Re-rank by recency
    const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const ALPHA = 0.7

    const candidates = pineconeResults.map((result: any) => {
      const purchaseDateMs = result.metadata.image_purchase_date || now
      const age = now - purchaseDateMs
      const recencyScore = Math.max(0, 1 - age / THREE_YEARS_MS)
      const combinedScore = ALPHA * result.score + (1 - ALPHA) * recencyScore

      return {
        ...result.metadata,
        similarity: result.score,
        recencyScore,
        combinedScore,
      }
    })

    // Sort by combined score
    candidates.sort((a, b) => b.combinedScore - a.combinedScore)

    // Take top 10
    const topCandidates = candidates.slice(0, 10)

    // Send status: Generating response
    send({ type: 'status', data: { status: 'Generating response...' } })

    // Generate Response
    const geminiResponse = await generateChatResponse(
      userMessageContent,
      topCandidates
    )

    // Save Assistant Message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      session_id: currentSessionId, // Link to session
      role: 'assistant',
      content: geminiResponse.assistant_message,
      assets: geminiResponse.assets,
    })

    // Stream Response
    send({
      type: 'result',
      data: {
        assistant_message: geminiResponse.assistant_message,
        assets: geminiResponse.assets,
      },
    })

    close()
  } catch (error: any) {
    console.error('Error in chat POST:', error)
    send({
      type: 'error',
      data: { error: error.message || 'Internal server error' },
    })
    close()
  }
}
