'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ChatMessage, BrandonAsset } from '@/lib/types'
import { AssetCard } from '@/components/asset-card'
import { ThinkingIndicator } from '@/components/thinking-indicator'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  LogOut,
  Trash2,
  Send,
  X,
  Camera,
  Mic,
  MicOff,
  Bot
} from 'lucide-react'
import { ChatSidebar } from '@/components/chat-sidebar'
import { cn } from '@/lib/utils'

import { AssetPreviewDialog } from '@/components/asset-preview-dialog'

export default function ChatPage() {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)


  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Asset Preview State
  const [previewAsset, setPreviewAsset] = useState<BrandonAsset | null>(null)

  // Voice Input State
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setUserRole(data?.role as 'admin' | 'user')
          })
      }
    })
  }, [supabase, router])



  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }

        if (finalTranscript) {
          setInputValue((prev) => {
            const newText = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript
            return newText
          })
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsListening(false)
      }
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Check authentication and load chat history
  // Check authentication
  useEffect(() => {
    checkAuth()
  }, [])

  // Load history when session changes
  useEffect(() => {
    if (currentSessionId) {
      // Only load history if we don't have messages (user selected existing session from sidebar)
      // Don't reload if we already have messages (session_id was just created during active chat)
      if (messages.length === 0) {
        loadChatHistory(currentSessionId)
      } else {
        setIsLoadingHistory(false)
      }
    } else {
      setMessages([])
      setIsLoadingHistory(false)
    }
  }, [currentSessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleData) {
      setUserRole(roleData.role as 'admin' | 'user')
    }
  }

  async function loadChatHistory(sessionId: string) {
    setIsLoadingHistory(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/history?session_id=${sessionId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  function handleNewChat() {
    setCurrentSessionId(null)
    setMessages([])
    setInputValue('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setSelectedImage(null)
    setImagePreview(null)
  }

  function handleSessionSelect(sessionId: string) {
    // Clear messages first so the useEffect knows to load new session's history
    setMessages([])
    setCurrentSessionId(sessionId)
  }

  async function handleClearHistory() {
    // Show the confirmation dialog (non-blocking)
    setShowConfirmDialog(true)
  }

  // Image Upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum size is 10MB.')
        return
      }
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function confirmClearHistory() {
    // Close the dialog
    setShowConfirmDialog(false)

    // Set loading state
    setIsClearing(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setIsClearing(false)
        return
      }

      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        // Use startTransition to defer state update and avoid blocking UI
        startTransition(() => {
          setMessages([])
        })
      }
    } catch (error) {
      console.error('Error clearing history:', error)
      alert('Failed to clear chat history. Please try again.')
    } finally {
      setIsClearing(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if ((!inputValue.trim() && !selectedImage) || isLoading) return

    // Save references before clearing state
    const imageToUpload = selectedImage
    const currentInput = inputValue

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: '', // Will be filled by backend
      role: 'user',
      content: currentInput,
      image: imagePreview || undefined,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsThinking(true)
    setStatusMessage('Analyzing your query...')

    // Clear image state but keep preview URL for the message
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Handle Image Upload vs Text Query
      if (imageToUpload) {
        const formData = new FormData()
        formData.append('image', imageToUpload)
        if (currentInput.trim()) {
          formData.append('query', currentInput)
        }
        if (currentSessionId) {
          formData.append('session_id', currentSessionId)
        }

        const response = await fetch('/api/chat/analyze-image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to analyze image')
        }

        const data = await response.json()

        // Update session ID if new
        if (data.session_id && data.session_id !== currentSessionId) {
          setCurrentSessionId(data.session_id)
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          user_id: session.user.id,
          role: 'assistant',
          content: data.assistant_message,
          assets: data.assets,
          created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        // Standard Text Chat (SSE)
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            session_id: currentSessionId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let assistantMessageContent = ''
        let assistantAssets: BrandonAsset[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n\n')

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue

            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'status') {
                setStatusMessage(data.data.status)
              } else if (data.type === 'session') {
                setCurrentSessionId(data.data.session_id)
              } else if (data.type === 'result') {
                assistantMessageContent = data.data.assistant_message
                assistantAssets = data.data.assets || []
              } else if (data.type === 'error') {
                throw new Error(data.data.error)
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
        }

        // Add assistant message to UI after stream completes
        if (assistantMessageContent) {
          const assistantMessageObj: ChatMessage = {
            id: crypto.randomUUID(),
            user_id: session.user.id,
            role: 'assistant',
            content: assistantMessageContent,
            assets: assistantAssets,
            created_at: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, assistantMessageObj])
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(error.message || 'Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
      setIsThinking(false)
      setStatusMessage('')
    }
  }

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Sidebar */}
      <ChatSidebar
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="absolute top-0 right-0 left-0 z-10 p-6 flex justify-between items-start pointer-events-none">
          {/* Left side title - aligned with content */}
          <div className="pointer-events-auto">
            <h1 className="text-xl font-bold tracking-tight">Brandon</h1>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(userRole === 'admin' ? '/admin' : '/dashboard')}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <div className="grid grid-cols-2 gap-[1px] w-3.5 h-3.5 opacity-70">
                <div className="bg-current rounded-[1px]"></div>
                <div className="bg-current rounded-[1px]"></div>
                <div className="bg-current rounded-[1px]"></div>
                <div className="bg-current rounded-[1px]"></div>
              </div>
              {userRole === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
            </Button>
          </div>
        </header>

        {/* Messages / Main Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 scroll-smooth">
          <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col min-h-full">

            {/* Empty State / Welcome */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
                  <Bot className="w-10 h-10" strokeWidth={2.5} />
                </div>

                <h2 className="text-4xl font-bold mb-4 tracking-tight text-center text-[#0F172A]">
                  Welcome to Brandon
                </h2>
                <p className="text-slate-500 text-lg mb-16 text-center max-w-lg leading-relaxed">
                  Your AI-powered brand asset assistant. Ask me to find
                  images or any questions about the brand identity.
                </p>

                {/* Suggested Queries Grid */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
                  <button
                    onClick={() => {
                      setInputValue("Find the images about the last campaign")
                    }}
                    className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200 text-left flex items-center h-24 group"
                  >
                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">&quot;Find the images about the last campaign&quot;</span>
                  </button>
                  <button
                    onClick={() => setInputValue("Show me images with digital cockpit and GPS")}
                    className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200 text-left flex items-center h-24 group"
                  >
                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">&quot;Show me images with digital cockpit and GPS&quot;</span>
                  </button>
                  <button
                    onClick={() => setInputValue("Search images with trucks on the highway")}
                    className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200 text-left flex items-center h-24 group"
                  >
                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">&quot;Search images with trucks on the highway&quot;</span>
                  </button>
                  <button
                    onClick={() => setInputValue("Find images of EV car and charging point")}
                    className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200 text-left flex items-center h-24 group"
                  >
                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">&quot;Find images of EV car and charging point&quot;</span>
                  </button>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="pt-20 pb-4">
              {messages.map((message) => (
                <div key={message.id} className="mb-8">
                  {message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="flex flex-col items-end gap-2 max-w-2xl">
                        {(message.image || message.image_url) && (
                          <div className="rounded-2xl overflow-hidden border bg-muted max-w-[200px] shadow-sm">
                            <img
                              src={
                                message.image ||
                                (message.image_url
                                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-preview/${message.image_url}`
                                  : '')
                              }
                              alt="User upload"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ; (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        <div className="bg-secondary text-secondary-foreground rounded-2xl px-5 py-3 text-base">
                          {message.content || (message.image ? 'Sent an image' : '')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                          🤖
                        </div>
                        <div className="rounded-2xl px-0 py-1 max-w-2xl text-base leading-relaxed">
                          {message.content}
                        </div>
                      </div>
                      {message.assets && message.assets.length > 0 && (
                        <div className="pl-12">
                          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {message.assets.map((asset) => (
                              <AssetCard
                                key={asset.id}
                                asset={asset}
                                onPreview={setPreviewAsset}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isThinking && (
              <div className="flex items-center gap-3 pl-2 mb-8 text-muted-foreground animate-pulse">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">...</div>
                <span className="text-sm">Brandon is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="fixed bottom-8 left-[340px] right-0 flex justify-center z-50 px-4">
          <div className="bg-background rounded-[2rem] shadow-lg border p-2 flex items-center gap-2 max-w-3xl w-full relative">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full pl-2">
              {/* Image Search Button */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                ref={fileInputRef}
              />

              {imagePreview ? (
                <div className="relative group shrink-0">
                  <div className="h-10 w-10 rounded-xl overflow-hidden border">
                    <img src={imagePreview} className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors text-sm font-medium shrink-0"
                >
                  <Camera className="h-5 w-5" />
                  <span>Search by image</span>
                </button>
              )}

              {/* Divider */}
              <div className="h-6 w-px bg-border mx-1"></div>

              {/* Input Field */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Ask me to find brand assets..."}
                  className="w-full h-11 bg-transparent border-none focus:outline-none text-base placeholder:text-muted-foreground/50"
                  disabled={isLoading || isThinking}
                />
              </div>

              {/* Functional Buttons */}
              <div className="flex items-center gap-1 pr-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9 text-muted-foreground hover:text-foreground", isListening && "text-red-500 animate-pulse")}
                  onClick={toggleListening}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                  type="submit"
                  disabled={!inputValue.trim() && !imagePreview}
                  size="icon"
                  className="h-9 w-9 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="absolute top-full mt-2 w-full text-center">
              <p className="text-[10px] text-muted-foreground">Brandon can make mistakes. Check important info.</p>
            </div>
          </div>
        </div>


        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={confirmClearHistory}
          title="Clear Chat History"
          description="Are you sure you want to clear your chat history? This action cannot be undone."
          confirmText="Clear History"
          cancelText="Cancel"
          isDestructive
        />

        {/* Asset Preview Dialog */}
        <AssetPreviewDialog
          asset={previewAsset}
          open={!!previewAsset}
          onOpenChange={(open) => !open && setPreviewAsset(null)}
        />
      </div>
    </div>
  )
}
