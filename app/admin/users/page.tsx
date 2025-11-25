'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Loader2, MoreHorizontal, Shield, Trash2, UserCog } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface UserData {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'user'
    created_at: string
    last_sign_in_at: string
}

export default function UsersPage() {
    const router = useRouter()
    const supabase = createClient()
    const [users, setUsers] = useState<UserData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Edit Role State
    const [editingUser, setEditingUser] = useState<UserData | null>(null)
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user')
    const [isUpdating, setIsUpdating] = useState(false)

    // Delete User State
    const [deletingUser, setDeletingUser] = useState<UserData | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            setCurrentUser(session.user)

            const response = await fetch('/api/admin/users', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch users')
            }

            const data = await response.json()
            setUsers(data.users || [])
        } catch (error) {
            console.error('Error loading users:', error)
            toast.error('Failed to load users')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleUpdateRole() {
        if (!editingUser) return

        setIsUpdating(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) return

            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    user_id: editingUser.id,
                    role: newRole,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update role')
            }

            toast.success('User role updated successfully')
            setEditingUser(null)
            loadUsers() // Refresh list
        } catch (error: any) {
            toast.error(error.message || 'Failed to update role')
        } finally {
            setIsUpdating(false)
        }
    }

    async function handleDeleteUser() {
        if (!deletingUser) return

        setIsDeleting(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) return

            const response = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    user_id: deletingUser.id,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete user')
            }

            toast.success('User deleted successfully')
            setDeletingUser(null)
            loadUsers() // Refresh list
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete user')
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-6">
                    <Button variant="outline" onClick={() => router.push('/admin')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">Manage Users</h1>
                    <div className="text-sm text-muted-foreground">
                        Total Users: {users.length}
                    </div>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="font-medium">{user.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                                }`}
                                        >
                                            {user.role}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        {user.last_sign_in_at
                                            ? formatDistanceToNow(new Date(user.last_sign_in_at), {
                                                addSuffix: true,
                                            })
                                            : 'Never'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setEditingUser(user)
                                                        setNewRole(user.role)
                                                    }}
                                                >
                                                    <UserCog className="h-4 w-4 mr-2" />
                                                    Edit Role
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    disabled={user.id === currentUser?.id}
                                                    onClick={() => setDeletingUser(user)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Edit Role Dialog */}
                <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit User Role</DialogTitle>
                            <DialogDescription>
                                Change the role for {editingUser?.email}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Select
                                value={newRole}
                                onValueChange={(val: 'admin' | 'user') => setNewRole(val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setEditingUser(null)}
                                disabled={isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateRole} disabled={isUpdating}>
                                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete User?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete <strong>{deletingUser?.email}</strong>?
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleDeleteUser()
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isDeleting}
                            >
                                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Delete User
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
