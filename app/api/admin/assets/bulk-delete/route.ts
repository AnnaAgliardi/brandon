import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth-helpers'
import { deleteVector } from '@/lib/pinecone'

export async function POST(request: NextRequest) {
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

        const body = await request.json()
        const { assetIds } = body

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json(
                { error: 'Invalid asset IDs provided' },
                { status: 400 }
            )
        }

        // Use service role client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get assets to retrieve storage paths
        const { data: assets, error: fetchError } = await supabaseAdmin
            .from('assets')
            .select('id, storage_path, preview_path')
            .in('id', assetIds)

        if (fetchError) {
            console.error('Error fetching assets for bulk delete:', fetchError)
            return NextResponse.json(
                { error: 'Failed to fetch assets' },
                { status: 500 }
            )
        }

        if (!assets || assets.length === 0) {
            return NextResponse.json({ error: 'No assets found' }, { status: 404 })
        }

        // Delete from database
        const { error: deleteError } = await supabaseAdmin
            .from('assets')
            .delete()
            .in('id', assetIds)

        if (deleteError) {
            console.error('Error bulk deleting assets from database:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete assets' },
                { status: 500 }
            )
        }

        // Delete from Supabase storage
        const fullPaths = assets.map((a) => a.storage_path)
        const previewPaths = assets.map((a) => a.preview_path)

        await supabaseAdmin.storage.from('assets-full').remove(fullPaths)
        await supabaseAdmin.storage.from('assets-preview').remove(previewPaths)

        // Delete from Pinecone
        for (const asset of assets) {
            try {
                await deleteVector(asset.id)
            } catch (error) {
                console.error(`Failed to delete vector for asset ${asset.id}:`, error)
                // Continue with other deletions
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${assets.length} asset(s)`,
            deletedCount: assets.length,
        })
    } catch (error: any) {
        console.error('Error in POST /api/admin/assets/bulk-delete:', error)

        if (error.message === 'Admin access required') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
