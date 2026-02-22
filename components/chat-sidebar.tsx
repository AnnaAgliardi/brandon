'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    MessageSquare,
    Plus,
    Search,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface ChatSession {
    id: string
    title: string
    updated_at: string
}

interface ChatSidebarProps {
    currentSessionId: string | null
    onSessionSelect: (sessionId: string) => void
    onNewChat: () => void
}

export function ChatSidebar({
    currentSessionId,
    onSessionSelect,
    onNewChat,
}: ChatSidebarProps) {
    const router = useRouter()
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    // const [isOpen, setIsOpen] = useState(true) // Always open in this design
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchSessions()
    }, [currentSessionId])

    async function fetchSessions() {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) return

            const response = await fetch('/api/chat/sessions', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setSessions(data.sessions || [])
            }
        } catch (error) {
            console.error('Error fetching sessions:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const filteredSessions = sessions.filter((session) =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex flex-col w-80 bg-background/90 backdrop-blur border-r border-blue-100 h-[100dvh] sticky top-0 flex-shrink-0">
            {/* Header Area */}
            <div className="p-4 space-y-4">
                <h2 className="font-semibold text-lg px-1">Chats</h2>

                <Button
                    onClick={onNewChat}
                    className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg h-10 gap-2 justify-center font-medium transition-all"
                >
                    <div className="border bg-white/20 rounded-sm p-[1px]">
                        <Plus className="h-3 w-3" />
                    </div>
                    New Chat
                </Button>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 rounded-md border-0 bg-muted/50 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/70"
                    />
                </div>
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-1 pb-4">
                    {filteredSessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => onSessionSelect(session.id)}
                            className={cn(
                                'w-full text-left px-3 py-3 rounded-lg text-sm transition-colors flex justify-between items-start group relative',
                                currentSessionId === session.id
                                    ? 'bg-accent/50 text-foreground'
                                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <div className="font-medium truncate pr-8">{session.title}</div>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                                {formatDistanceToNow(new Date(session.updated_at), {
                                    addSuffix: true,
                                }).replace('about ', '').replace(' ago', 'm')}
                            </span>
                        </button>
                    ))}
                    {filteredSessions.length === 0 && !isLoading && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            No chats found
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* User Profile Footer */}
            <div className="p-4 border-t mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer w-full text-left"
                >
                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                        B
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">Brandon User</div>
                        <div className="text-xs text-muted-foreground truncate">Admin</div>
                    </div>
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>
        </div>
    )
}
