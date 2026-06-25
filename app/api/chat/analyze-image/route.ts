import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-helpers'
import { analyzeImage, generateChatResponse } from '@/lib/gemini'
import { generateEmbedding } from '@/lib/openai'
import { queryVectors } from '@/lib/pinecone'

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const user = await requireAuth(supabase)

        // 2. Parse FormData
        const formData = await request.formData()
        const image = formData.get('image') as File
        const query = formData.get('query') as string | null
        const sessionId = formData.get('session_id') as string | null

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 })
        }

        // Handle Session
        let currentSessionId = sessionId
        let isNewSession = false

        if (!currentSessionId) {
            // Create new session if none provided
            const { data: newSession, error: sessionError } = await supabase
                .from('chat_sessions')
                .insert({
                    user_id: user.id,
                    title: query ? query.slice(0, 30) : 'Image Analysis',
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

        // 3. Process Image
        const arrayBuffer = await image.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const mimeType = image.type

        // Upload the user's query image with a service-role client. The
        // assets-preview bucket's INSERT policy is admin-only, so uploading with
        // the user's session client (anon key) fails for non-admin chat users
        // with "new row violates row-level security policy". This mirrors the
        // admin ingestion route, which also uploads to storage via service role.
        const fileName = `${user.id}/${Date.now()}-${image.name}`
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { error: uploadError } = await supabaseAdmin.storage
            .from('assets-preview')
            .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: false
            })

        if (uploadError) {
            console.error('Error uploading image:', uploadError)
        }

        // Only persist the path when the upload succeeded, so chat history never
        // references a non-existent object.
        const imagePath = uploadError ? null : fileName

        // 4. Analyze with Gemini Vision
        console.log('Analyzing image with Gemini Vision...')
        const analysis = await analyzeImage(buffer, mimeType)

        // Combine user query with image analysis if present
        // Note: analysis object has 'summary', not 'llm_description'
        const imageDescription = `${analysis.summary}. Subjects: ${analysis.subjects.join(', ')}. Keywords: ${analysis.keywords.join(', ')}`

        const searchContext = query
            ? `User query: "${query}". Image content: ${imageDescription}`
            : imageDescription

        console.log('Analysis complete. Generating embedding...')

        // 5. Generate Embedding & Search
        const embedding = await generateEmbedding(searchContext)

        const pineconeResults = await queryVectors(
            embedding,
            30,
            { status: 'approved' }
        )

        // 6. Rank Results (Recency + Similarity)
        const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000
        const now = Date.now()
        const ALPHA = 0.7 // Slightly lower alpha to give more weight to recency/diversity for visual search

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

        candidates.sort((a, b) => b.combinedScore - a.combinedScore)
        const topCandidates = candidates.slice(0, 7)

        // 7. Generate Response
        console.log('Generating chat response...')
        const geminiResponse = await generateChatResponse(
            searchContext,
            topCandidates
        )

        // 8. Save Interaction (Optional: Save image to storage if needed, currently just saving text)
        // We save the analysis as the user content to provide context in history
        const userContent = query
            ? `[Image Upload] ${query} \n\nImage Analysis: ${analysis.summary}`
            : `[Image Upload] Image Analysis: ${analysis.summary}`

        await supabase.from('chat_messages').insert({
            user_id: user.id,
            session_id: currentSessionId, // Link to session
            role: 'user',
            content: userContent,
            image_url: imagePath, // Save storage path
        })


        await supabase.from('chat_messages').insert({
            user_id: user.id,
            session_id: currentSessionId, // Link to session
            role: 'assistant',
            content: geminiResponse.assistant_message,
            assets: geminiResponse.assets,
        })

        // Enrich assets with full metadata from candidates
        const enrichedAssets = geminiResponse.assets.map((asset: any) => {
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

        return NextResponse.json({
            session_id: currentSessionId, // Return session ID
            assistant_message: geminiResponse.assistant_message,
            assets: enrichedAssets,
            analysis: analysis, // Optional: return analysis if we want to show it
            image_path: imagePath // Return path to frontend
        })

    } catch (error: any) {
        console.error('Error in analyze-image:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
