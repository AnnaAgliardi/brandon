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
  X, // Added X icon
  Camera, // Added Camera icon
} from 'lucide-react'

export default function ChatPage() {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false) // Keep isLoading for button disable
  const [isThinking, setIsThinking] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Check authentication and load chat history
  useEffect(() => {
    checkAuth()
    loadChatHistory()
  }, [])

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
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData) {
      setUserRole(roleData.role as 'admin' | 'user')
    }
  }

  async function loadChatHistory() {
    setIsLoadingHistory(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/history', {
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

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: '', // Will be filled by backend
      role: 'user',
      content: inputValue,
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
      if (selectedImage) {
        const formData = new FormData()
        formData.append('image', selectedImage)
        if (inputValue.trim()) {
          formData.append('query', inputValue)
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

  if (isLoadingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Brandon</h1>
            {userRole === 'admin' && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin')}
              >
                Admin Dashboard
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={isClearing || isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? 'Clearing...' : 'Clear History'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-2">
                Welcome to Brandon
              </h2>
              <p className="text-muted-foreground">
                Your AI-powered brand asset assistant. Ask me to find images
                from your DAM.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="mb-6">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-2 max-w-2xl">
                    {message.image && (
                      <div className="rounded-lg overflow-hidden border bg-muted max-w-[200px]">
                        <img
                          src={message.image}
                          alt="User upload"
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                    <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2">
                      {message.content || (message.image ? 'Sent an image' : '')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-2xl">
                    {message.content}
                  </div>
                  {message.assets && message.assets.length > 0 && (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {message.assets.map((asset) => (
                        <AssetCard key={asset.id} asset={asset} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isThinking && <ThinkingIndicator status={statusMessage} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background fixed bottom-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
            {imagePreview && (
              <div className="relative w-fit mb-2">
                <div className="rounded-lg overflow-hidden border bg-muted h-20 w-20">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-12 px-4 border-input hover:bg-accent hover:text-accent-foreground flex items-center gap-2 whitespace-nowrap"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Camera className="h-5 w-5" />
                <span className="font-medium">Search by image</span>
              </Button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Ask me to find brand assets..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  disabled={isLoading}
                  className="w-full h-12 px-4 rounded-xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || (!inputValue.trim() && !selectedImage)}
                className="h-12 w-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shrink-0 p-0 flex items-center justify-center"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Spacer for fixed input */}
      <div className="h-24" />

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
    </div>
  )
}
