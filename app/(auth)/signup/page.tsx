'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClientOrNull } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = getSupabaseClientOrNull()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <Settings className="h-6 w-6" />
            </div>
            <CardTitle>Setup required</CardTitle>
            <CardDescription>
              Supabase is not configured yet. To use signup and chat, add your
              credentials to the environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Copy <code className="bg-muted px-1 rounded">.env.example</code> to <code className="bg-muted px-1 rounded">.env.local</code></li>
              <li>Add your <code className="bg-muted px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-muted px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> from the Supabase dashboard</li>
              <li>Restart the dev server</li>
            </ol>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/">Back to home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Check if this is the first user
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })

      const isFirstUser = !roleError && roleData === null

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!data.user) {
        setError('Failed to create user account')
        return
      }

      // Assign role (first user becomes admin)
      const role = isFirstUser ? 'admin' : 'user'

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role,
        })

      if (insertError) {
        console.error('Failed to assign role:', insertError)
      }

      router.push('/chat')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>
            Sign up to start using Brandon, your brand asset assistant
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
