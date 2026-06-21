import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-helpers'
import { generateEmbedding } from '@/lib/openai'
import { queryVectors } from '@/lib/pinecone'
import { generateChatResponse } from '@/lib/gemini'
import { rerankCandidates } from '@/lib/rerank'
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

    // Build a retrieval query from the last couple of user turns so follow-ups
    // ("show me more like that", "the red one") keep context. The embedding is
    // started immediately so the OpenAI round-trip overlaps the session writes.
    const recentUserTurns = (messages as any[])
      .filter((m) => m?.role === 'user' && typeof m.content === 'string' && m.content.trim())
      .slice(-2)
      .map((m) => m.content.trim())
    const retrievalQuery = recentUserTurns.join('\n') || userMessageContent
    const embeddingPromise = generateEmbedding(retrievalQuery)

    if (!currentSessionId) {
      // Create new session if none provided (awaited: we need the id to link messages)
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
      // Bump the session timestamp without blocking the search path
      void supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentSessionId)
    }

    // Send session ID to client immediately
    send({ type: 'session', data: { session_id: currentSessionId } })

    // Persist the user message in the background; it isn't needed by the search
    // path, so we await it only at the end (alongside the assistant message).
    const userMessageInsert = supabase.from('chat_messages').insert({
      user_id: user.id,
      session_id: currentSessionId, // Link to session
      role: 'user',
      content: userMessageContent,
    })

    // Send status: Analyzing query
    send({ type: 'status', data: { status: 'Analyzing your query...' } })

    // Await the embedding (started above, overlapped with the DB writes)
    const queryEmbedding = await embeddingPromise

    // Send status: Searching
    send({ type: 'status', data: { status: 'Searching the asset library...' } })

    // Vector search
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

    // Rerank candidates (internal reranker today; Cognee is a future drop-in).
    const ranked = await rerankCandidates(userMessageContent, pineconeResults as any[])

    // Take the top candidates for response generation
    const topCandidates = ranked.slice(0, 10)

    // Send status: Generating response
    send({ type: 'status', data: { status: 'Generating response...' } })

    // Generate Response
    const geminiResponse = await generateChatResponse(
      userMessageContent,
      topCandidates
    )

    // Enrich assets with full metadata from candidates
    const enrichedAssets = geminiResponse.assets.map((asset: BrandonAsset) => {
      const candidate = topCandidates.find((c: any) => c.assetId === asset.id)
      if (candidate) {
        return {
          ...asset,
          storage_path: candidate.storage_path,
          brand: candidate.brand,
          status: candidate.status,
          region_representation: candidate.region_representation,
          campaign: candidate.campaign,
          location: candidate.location,
          license_type_usage: candidate.license_type_usage,
          llm_description: candidate.llm_description,
        }
      }
      return asset
    })

    // Send the result FIRST so the user sees the answer immediately, then persist.
    send({
      type: 'result',
      data: {
        assistant_message: geminiResponse.assistant_message,
        assets: enrichedAssets,
      },
    })

    // Persist both messages after responding (off the perceived-latency path).
    const [userResult, assistantResult] = await Promise.all([
      userMessageInsert,
      supabase.from('chat_messages').insert({
        user_id: user.id,
        session_id: currentSessionId, // Link to session
        role: 'assistant',
        content: geminiResponse.assistant_message,
        assets: enrichedAssets,
      }),
    ])

    if (userResult.error) console.error('Failed to save user message:', userResult.error)
    if (assistantResult.error) console.error('Failed to save assistant message:', assistantResult.error)

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
