'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    MessageSquare,
    Plus,
    Search,
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
    onLogout: () => void
}

export function ChatSidebar({
    currentSessionId,
    onSessionSelect,
    onNewChat,
    onLogout,
}: ChatSidebarProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isOpen, setIsOpen] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchSessions()
    }, [currentSessionId]) // Refresh list when session changes (e.g. title update)

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

    const filteredSessions = sessions.filter((session) =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div
            className={cn(
                'flex flex-col border-r bg-muted/10 transition-all duration-300 ease-in-out h-screen sticky top-0',
                isOpen ? 'w-80' : 'w-[60px]'
            )}
        >
            {/* Header / Toggle */}
            <div className="p-4 flex items-center justify-between border-b h-[60px]">
                {isOpen && <span className="font-semibold">Chats</span>}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(!isOpen)}
                    className="ml-auto h-8 w-8"
                >
                    {isOpen ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* New Chat & Search */}
            {isOpen ? (
                <div className="p-4 space-y-4">
                    <Button onClick={onNewChat} className="w-full justify-start gap-2">
                        <Plus className="h-4 w-4" />
                        New Chat
                    </Button>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 pl-8 pr-4 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
            ) : (
                <div className="p-2 flex flex-col items-center gap-2 mt-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setIsOpen(true)
                            onNewChat()
                        }}
                        title="New Chat"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(true)}
                        title="Search"
                    >
                        <Search className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* Session List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isOpen ? (
                        filteredSessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => onSessionSelect(session.id)}
                                className={cn(
                                    'w-full text-left px-3 py-3 rounded-lg text-sm transition-colors flex items-start gap-3 group',
                                    currentSessionId === session.id
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="font-medium truncate">{session.title}</div>
                                    <div className="text-xs opacity-70 truncate">
                                        {formatDistanceToNow(new Date(session.updated_at), {
                                            addSuffix: true,
                                        })}
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        // Collapsed view icons
                        filteredSessions.map((session) => (
                            <Button
                                key={session.id}
                                variant={currentSessionId === session.id ? 'secondary' : 'ghost'}
                                size="icon"
                                onClick={() => onSessionSelect(session.id)}
                                className="w-full mb-1"
                                title={session.title}
                            >
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        ))
                    )}
                    {isOpen && filteredSessions.length === 0 && !isLoading && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            No chats found
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer / Logout */}
            <div className="p-4 border-t mt-auto">
                {isOpen ? (
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                        onClick={onLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-full text-muted-foreground hover:text-destructive"
                        onClick={onLogout}
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
