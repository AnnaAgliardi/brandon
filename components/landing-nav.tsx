'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseClientOrNull } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'

export function LandingNav() {
  const router = useRouter()
  const supabase = getSupabaseClientOrNull()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    supabase ? null : false
  )

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          Brandon
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Explore
          </Link>
          {isAuthenticated === null ? (
            <span className="h-9 w-16 bg-muted animate-pulse rounded-md" aria-hidden />
          ) : isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/chat">Go to Chat</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
