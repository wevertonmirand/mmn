'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/actions/sales'

export async function requestPrizeAction(prizeId: string): Promise<ActionResult> {
  const supabase = createClient()

  const { error } = await supabase.rpc('request_prize', { p_prize_id: prizeId })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/admin/premios')
  return { ok: true }
}
