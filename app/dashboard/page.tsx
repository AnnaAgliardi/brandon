'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, User, ImageIcon, ArrowLeft } from 'lucide-react'

export default function DashboardPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Welcome back! Access your tools and settings below.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Chat
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/')}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Brandon Chat
                            </CardTitle>
                            <CardDescription>
                                AI-powered asset assistant
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Ask Brandon to find images, answer questions, or help you navigate your brand assets.
                            </p>
                            <Button variant="secondary" className="w-full">
                                Open Chat
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/assets')}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Asset Manager
                            </CardTitle>
                            <CardDescription>
                                Browse and download assets
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                View the full library of brand assets. Filter by status, brand, or region.
                            </p>
                            <Button variant="secondary" className="w-full">
                                View Assets
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/account')}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Account Manager
                            </CardTitle>
                            <CardDescription>
                                Manage your profile
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Update your email, password, or name. Manage your account settings.
                            </p>
                            <Button variant="secondary" className="w-full">
                                Manage Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
