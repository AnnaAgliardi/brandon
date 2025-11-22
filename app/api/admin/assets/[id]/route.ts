import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth-helpers'
import { upsertVector, deleteVector } from '@/lib/pinecone'
import { generateEmbedding } from '@/lib/openai'
import { analyzeImage } from '@/lib/gemini'
import { PineconeMetadata } from '@/lib/types'
import sharp from 'sharp'

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

        // Parse FormData
        const formData = await request.formData()
        const newImage = formData.get('newImage') as File | null

        // Extract metadata fields from FormData
        const metadata: any = {}
        for (const [key, value] of formData.entries()) {
            if (key !== 'newImage' && value) {
                metadata[key] = value
            }
        }

        // Use service role client for database operations
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get existing asset
        const { data: existingAsset, error: fetchError } = await supabaseAdmin
            .from('assets')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !existingAsset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
        }

        let updatedStoragePath = existingAsset.storage_path
        let updatedPreviewPath = existingAsset.preview_path
        let llmDescription = existingAsset.llm_description
        let tags = existingAsset.tags

        // Handle image replacement
        if (newImage) {
            const timestamp = Date.now()
            const fileName = `asset_${timestamp}`

            // Convert File to Buffer
            const arrayBuffer = await newImage.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // Upload full image
            const fullPath = `${fileName}.jpg`
            const { error: fullUploadError } = await supabaseAdmin.storage
                .from('assets-full')
                .upload(fullPath, buffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                })

            if (fullUploadError) {
                console.error('Error uploading full image:', fullUploadError)
                throw new Error('Failed to upload full image')
            }

            // Generate preview (512px max)
            const previewBuffer = await sharp(buffer)
                .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer()

            const previewPath = `${fileName}_preview.jpg`
            const { error: previewUploadError } = await supabaseAdmin.storage
                .from('assets-preview')
                .upload(previewPath, previewBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                })

            if (previewUploadError) {
                console.error('Error uploading preview:', previewUploadError)
                throw new Error('Failed to upload preview')
            }

            // Analyze new image with Gemini
            const analysisResult = await analyzeImage(buffer, 'image/jpeg')
            llmDescription = analysisResult.description
            tags = analysisResult.tags

            // Delete old images
            if (existingAsset.storage_path) {
                await supabaseAdmin.storage
                    .from('assets-full')
                    .remove([existingAsset.storage_path])
            }
            if (existingAsset.preview_path) {
                await supabaseAdmin.storage
                    .from('assets-preview')
                    .remove([existingAsset.preview_path])
            }

            updatedStoragePath = fullPath
            updatedPreviewPath = previewPath
        }

        // Update asset in database
        const { data: asset, error: updateError } = await supabaseAdmin
            .from('assets')
            .update({
                storage_path: updatedStoragePath,
                preview_path: updatedPreviewPath,
                llm_description: llmDescription,
                tags: tags,
                usage_rights: metadata.usage_rights || existingAsset.usage_rights,
                status: metadata.status || existingAsset.status,
                image_purchase_date:
                    metadata.image_purchase_date || existingAsset.image_purchase_date,
                image_capture_date:
                    metadata.image_capture_date || existingAsset.image_capture_date,
                license_type_usage:
                    metadata.license_type_usage || existingAsset.license_type_usage,
                license_type_subscription:
                    metadata.license_type_subscription ||
                    existingAsset.license_type_subscription,
                dam_id: metadata.dam_id || existingAsset.dam_id,
                url: metadata.url || existingAsset.url,
                file_name: metadata.file_name || existingAsset.file_name,
                acquired_at: metadata.acquired_at || existingAsset.acquired_at,
                partner: metadata.partner || existingAsset.partner,
                client: metadata.client || existingAsset.client,
                brand: metadata.brand || existingAsset.brand,
                collection: metadata.collection || existingAsset.collection,
                region_representation:
                    metadata.region_representation || existingAsset.region_representation,
                location: metadata.location || existingAsset.location,
                campaign: metadata.campaign || existingAsset.campaign,
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
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
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
        await supabaseAdmin.storage
            .from('assets-full')
            .remove([asset.storage_path])
        await supabaseAdmin.storage
            .from('assets-preview')
            .remove([asset.preview_path])

        // Delete from Pinecone
        await deleteVector(id)

        return NextResponse.json({
            success: true,
            message: 'Asset deleted successfully',
        })
    } catch (error: any) {
        console.error('Error in DELETE /api/admin/assets/[id]:', error)

        if (error.message === 'Admin access required') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
