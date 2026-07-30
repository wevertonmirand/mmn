'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'
import { supabaseKey, supabaseUrl } from '@/lib/supabase/env'

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl(),
    supabaseKey(),
  )
}
