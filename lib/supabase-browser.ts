import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, key }
}

/** Returns Supabase client when configured, or null when env vars are missing/invalid. Use for optional auth (e.g. landing nav). */
export function getSupabaseClientOrNull(): SupabaseClient | null {
  const { url, key } = getEnv()
  if (!url || !key) return null
  // Reject placeholder or invalid values (Supabase URLs contain "supabase.co")
  if (!url.includes('supabase.co') || key.startsWith('your_')) return null
  if (!_client) _client = createSupabaseClient(url, key)
  return _client
}

/** Returns Supabase client. Throws when env vars are missing. Use for pages that require auth. */
export function createClient(): SupabaseClient {
  const client = getSupabaseClientOrNull()
  if (!client) {
    throw new Error(
      'Missing Supabase configuration. Copy .env.example to .env.local and add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the Supabase dashboard. Then restart the dev server.'
    )
  }
  return client
}
