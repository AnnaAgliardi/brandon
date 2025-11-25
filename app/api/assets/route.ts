import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
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

        // Verify authentication (any authenticated user)
        await requireAuth(supabase)

        // Get query params
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const status = searchParams.get('status')
        const brand = searchParams.get('brand')
        const region = searchParams.get('region')

        // Use service role client for database access (bypassing RLS for read-only view controlled here)
        // Note: In a production app with strict RLS, we might use the user's client, 
        // but here we want to ensure they can see assets even if RLS is strict for admins.
        // Given the requirement is "view-only", we'll fetch all assets but only expose GET.
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Build query
        let query = supabaseAdmin
            .from('assets')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        // Apply filters
        if (status) {
            query = query.eq('status', status)
        }
        if (brand) {
            query = query.eq('brand', brand)
        }
        if (region) {
            query = query.eq('region_representation', region)
        }

        // Apply pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data: assets, error, count } = await query

        if (error) {
            console.error('Error fetching assets:', error)
            return NextResponse.json(
                { error: 'Failed to fetch assets' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            assets: assets || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        })
    } catch (error: any) {
        console.error('Error in GET /api/assets:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
