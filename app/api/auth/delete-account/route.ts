import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-helpers'

export async function DELETE(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Verify the user making the request
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const user = await requireAuth(supabase)

        // 2. Use Service Role to delete the user from Auth
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            user.id
        )

        if (deleteError) {
            console.error('Error deleting user:', deleteError)
            throw deleteError
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error in delete account:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
