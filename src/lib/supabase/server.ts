import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'
import { supabaseKey, supabaseUrl } from '@/lib/supabase/env'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    supabaseUrl(),
    supabaseKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Components cannot set cookies; the middleware refreshes the session.
          }
        },
      },
    },
  )
}
