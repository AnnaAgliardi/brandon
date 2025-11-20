import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth-helpers'
import { AssetMetadataSchema } from '@/lib/types'
import { upsertVector, deleteVector } from '@/lib/pinecone'
import { generateEmbedding } from '@/lib/openai'
import { PineconeMetadata } from '@/lib/types'

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get auth header
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        // Verify admin role
        await requireAdmin(supabase)

        const { id } = params
        const body = await request.json()

        // Validate metadata
        const validatedData = AssetMetadataSchema.parse(body)

        // Use service role client for database operations
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Update asset in database
        const { data: asset, error: updateError } = await supabaseAdmin
            .from('assets')
            .update({
                usage_rights: validatedData.usage_rights,
                status: validatedData.status,
                image_purchase_date: validatedData.image_purchase_date,
                image_capture_date: validatedData.image_capture_date,
                license_type_usage: validatedData.license_type_usage,
                license_type_subscription: validatedData.license_type_subscription,
                dam_id: validatedData.dam_id || null,
                url: validatedData.url || null,
                file_name: validatedData.file_name || null,
                acquired_at: validatedData.acquired_at || null,
                partner: validatedData.partner || null,
                client: validatedData.client || null,
                brand: validatedData.brand || null,
                collection: validatedData.collection || null,
                region_representation: validatedData.region_representation || null,
                location: validatedData.location || null,
                campaign: validatedData.campaign || null,
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError || !asset) {
            console.error('Error updating asset:', updateError)
            return NextResponse.json(
                { error: 'Failed to update asset' },
                { status: 500 }
            )
        }

        // Update Pinecone metadata
        const pineconeMetadata: PineconeMetadata = {
            assetId: asset.id,
            dam_id: asset.dam_id || undefined,
            file_name: asset.file_name || undefined,
            url: asset.url || undefined,
            preview_path: asset.preview_path,
            llm_description: asset.llm_description,
            tags: asset.tags || undefined,
            usage_rights: asset.usage_rights,
            status: asset.status,
            license_type_usage: asset.license_type_usage,
            license_type_subscription: asset.license_type_subscription,
            brand: asset.brand || undefined,
            collection: asset.collection || undefined,
            region_representation: asset.region_representation || undefined,
            partner: asset.partner || undefined,
            client: asset.client || undefined,
            location: asset.location || undefined,
            campaign: asset.campaign || undefined,
            image_purchase_date: new Date(asset.image_purchase_date).getTime(),
            image_capture_date: new Date(asset.image_capture_date).getTime(),
        }

        // Regenerate embedding and update Pinecone
        const embedding = await generateEmbedding(asset.llm_description)
        await upsertVector(asset.id, embedding, pineconeMetadata)

        return NextResponse.json({ success: true, asset })
    } catch (error: any) {
        console.error('Error in PATCH /api/admin/assets/[id]:', error)

        if (error.message === 'Admin access required') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get auth header
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        // Verify admin role
        await requireAdmin(supabase)

        const { id } = params

        // Use service role client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get asset to retrieve storage paths
        const { data: asset, error: fetchError } = await supabaseAdmin
            .from('assets')
            .select('storage_path, preview_path')
            .eq('id', id)
            .single()

        if (fetchError || !asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
        }

        // Delete from database
        const { error: deleteError } = await supabaseAdmin
            .from('assets')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Error deleting asset from database:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete asset' },
                { status: 500 }
            )
        }

        // Delete from Supabase storage
        await supabaseAdmin.storage.from('assets-full').remove([asset.storage_path])
        await supabaseAdmin.storage.from('assets-preview').remove([asset.preview_path])

        // Delete from Pinecone
        await deleteVector(id)

        return NextResponse.json({ success: true, message: 'Asset deleted successfully' })
    } catch (error: any) {
        console.error('Error in DELETE /api/admin/assets/[id]:', error)

        if (error.message === 'Admin access required') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
