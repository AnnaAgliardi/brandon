import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth-helpers'

// Initialize Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify Admin Access
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        )
        await requireAdmin(supabase)

        // Fetch all users from Auth (requires service role)
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

        if (usersError) throw usersError

        // Fetch all roles
        const { data: roles, error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .select('*')

        if (rolesError) throw rolesError

        // Merge data
        const usersWithRoles = users.map(user => {
            const roleData = roles.find(r => r.user_id === user.id)
            return {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name,
                role: roleData?.role || 'user',
                created_at: user.created_at,
                last_sign_in_at: user.last_sign_in_at
            }
        })

        return NextResponse.json({ users: usersWithRoles })
    } catch (error: any) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify Admin Access
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const adminUser = await requireAdmin(supabase)

        const { user_id } = await request.json()

        if (!user_id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // Prevent self-deletion
        if (user_id === adminUser.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
        }

        // Delete user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

        if (deleteError) throw deleteError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting user:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify Admin Access
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const adminUser = await requireAdmin(supabase)

        const { user_id, role } = await request.json()

        if (!user_id || !role) {
            return NextResponse.json({ error: 'User ID and role required' }, { status: 400 })
        }

        // Prevent self-demotion (optional, but good safety)
        if (user_id === adminUser.id && role !== 'admin') {
            return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
        }

        // Update role in user_roles table
        const { error: updateError } = await supabaseAdmin
            .from('user_roles')
            .upsert({ user_id, role })

        if (updateError) throw updateError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating user role:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
