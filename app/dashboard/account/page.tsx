'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClientOrNull } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card'
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
import { ArrowLeft, User, Lock, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function MemberAccountPage() {
    const router = useRouter()
    const supabase = getSupabaseClientOrNull()
    const [isLoading, setIsLoading] = useState(true)
    const [user, setUser] = useState<any>(null)

    // Profile State
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

    // Password State
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    // Delete Account State
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (!supabase) {
            router.push('/login')
            return
        }
        loadUser()
    }, [supabase])

    async function loadUser() {
        if (!supabase) return
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)
            setEmail(user.email || '')
            setFullName(user.user_metadata?.full_name || '')
        } catch (error) {
            console.error('Error loading user:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault()
        if (!supabase) return
        setIsUpdatingProfile(true)

        try {
            const updates: any = {
                data: { full_name: fullName },
            }

            if (email !== user.email) {
                updates.email = email
            }

            const { error } = await supabase.auth.updateUser(updates)

            if (error) throw error

            toast.success('Profile updated successfully')
            if (email !== user.email) {
                toast.info('Please check your email to confirm the change.')
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile')
        } finally {
            setIsUpdatingProfile(false)
        }
    }

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault()
        if (!supabase) return
        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setIsUpdatingPassword(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            toast.success('Password updated successfully')
            setPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password')
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    async function handleDeleteAccount() {
        if (!supabase) return
        setIsDeleting(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) return

            const response = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete account')
            }

            await supabase.auth.signOut()
            toast.success('Account deleted successfully')
            router.push('/login')
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete account')
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

    if (!supabase || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="mb-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <h1 className="text-3xl font-bold mb-8">Account Manager</h1>

                <div className="space-y-8">
                    {/* Profile Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>
                                Update your account details
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdateProfile}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isUpdatingProfile}>
                                    {isUpdatingProfile && (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    )}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* Password Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Change Password
                            </CardTitle>
                            <CardDescription>
                                Ensure your account is using a long, random password to stay secure.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdatePassword}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isUpdatingPassword}>
                                    {isUpdatingPassword && (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    )}
                                    Update Password
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <Trash2 className="h-5 w-5" />
                                Danger Zone
                            </CardTitle>
                            <CardDescription>
                                Irreversible actions for your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Once you delete your account, there is no going back. Please be certain.
                            </p>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                account and remove your data from our servers.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleDeleteAccount()
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isDeleting}
                            >
                                {isDeleting && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Delete Account
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
