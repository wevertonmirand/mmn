'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/actions/sales'
import type { PrizeStatus, ThemeName } from '@/lib/types'

/** Aprovar subtrai os pontos da rede recursivamente (via RPC no banco). */
export async function reviewCancellationAction(
  saleId: string,
  approve: boolean,
): Promise<ActionResult> {
  const supabase = createClient()

  const { error } = await supabase.rpc('review_sale_cancellation', {
    p_sale_id: saleId,
    p_approve: approve,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/cancelamentos')
  revalidatePath('/admin')
  return { ok: true }
}

export async function reviewPrizeRequestAction(
  requestId: string,
  status: Extract<PrizeStatus, 'entregue' | 'recusado'>,
  notes?: string,
): Promise<ActionResult> {
  const supabase = createClient()

  const { error } = await supabase.rpc('review_prize_request', {
    p_request_id: requestId,
    p_status: status,
    p_notes: notes?.trim() || null,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/premios')
  revalidatePath('/admin')
  return { ok: true }
}

export async function upsertPrizeAction(formData: FormData): Promise<ActionResult> {
  const supabase = createClient()

  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const requiredPoints = Number(formData.get('required_points') ?? 0)
  const isActive = formData.get('is_active') === 'on'

  if (!name) return { ok: false, error: 'Informe o nome do prêmio.' }
  if (!Number.isInteger(requiredPoints) || requiredPoints <= 0) {
    return { ok: false, error: 'Pontos necessários devem ser um inteiro maior que zero.' }
  }

  const payload = {
    name,
    description: description || null,
    required_points: requiredPoints,
    is_active: isActive,
  }

  const { error } = id
    ? await supabase.from('prizes').update(payload).eq('id', id)
    : await supabase.from('prizes').insert(payload)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/premios')
  return { ok: true }
}

/** Master switch da gamificação + theme switcher global. */
export async function updateSettingsAction(
  patch: { gamification_enabled?: boolean; theme?: ThemeName; min_products_monthly?: number },
): Promise<ActionResult> {
  const supabase = createClient()

  if (
    patch.min_products_monthly !== undefined &&
    (!Number.isInteger(patch.min_products_monthly) || patch.min_products_monthly < 0)
  ) {
    return { ok: false, error: 'Mínimo de produtos deve ser um inteiro não negativo.' }
  }

  const { error } = await supabase.from('settings').update(patch).eq('id', true)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function closeMonthAction(period?: string): Promise<ActionResult> {
  const supabase = createClient()

  const { error } = await supabase.rpc('fn_close_month', { p_period: period ?? null })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin')
  revalidatePath('/admin/usuarios')
  return { ok: true }
}
