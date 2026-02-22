'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, User, ImageIcon, ArrowLeft } from 'lucide-react'

export default function DashboardPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#F8F9FC] p-8 relative overflow-hidden">
            <div className="absolute top-6 right-8 h-72 w-72 rounded-full bg-blue-400/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-8 left-2 h-80 w-80 rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto relative">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <p className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 mb-3">
                            Member workspace
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</span>
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Welcome back! Access your tools and settings below.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/chat')}
                        className="rounded-full bg-white/80 backdrop-blur border-blue-200 hover:bg-blue-50"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Chat
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card
                        className="cursor-pointer bg-white/75 backdrop-blur border-blue-100 rounded-3xl transition-all duration-300 hover:-translate-y-1"
                        onClick={() => router.push('/chat')}
                    >
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
                            <Button variant="secondary" className="w-full rounded-xl">
                                Open Chat
                            </Button>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer bg-white/75 backdrop-blur border-blue-100 rounded-3xl transition-all duration-300 hover:-translate-y-1"
                        onClick={() => router.push('/dashboard/assets')}
                    >
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
                            <Button variant="secondary" className="w-full rounded-xl">
                                View Assets
                            </Button>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer bg-white/75 backdrop-blur border-blue-100 rounded-3xl transition-all duration-300 hover:-translate-y-1"
                        onClick={() => router.push('/dashboard/account')}
                    >
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
                            <Button variant="secondary" className="w-full rounded-xl">
                                Manage Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
