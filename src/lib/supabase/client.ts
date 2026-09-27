import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://gzterzqlzbtrcsklpkzk.supabase.co'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGVyenFsemJ0cmNza2xwa3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjE0ODgsImV4cCI6MjEwNjA5NzQ4OH0.9hPdYLT-AC7RvJBURxBPI3f5iWFXUk6uGzER6-OgW4Y'

  browserClient = createBrowserClient(url, key)

  return browserClient
}
