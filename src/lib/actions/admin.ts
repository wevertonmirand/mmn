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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  patch: {
    gamification_enabled?: boolean
    theme?: ThemeName
    min_products_monthly?: number
    brand_name?: string
    brand_tagline?: string | null
    logo_url?: string | null
    logo_icon_url?: string | null
  },
): Promise<ActionResult> {
  const supabase = await createClient()

  if (
    patch.min_products_monthly !== undefined &&
    (!Number.isInteger(patch.min_products_monthly) || patch.min_products_monthly < 0)
  ) {
    return { ok: false, error: 'Mínimo de produtos deve ser um inteiro não negativo.' }
  }

  if (patch.brand_name !== undefined && !patch.brand_name.trim()) {
    return { ok: false, error: 'O nome da marca não pode ficar em branco.' }
  }

  // Uma URL inválida deixaria o logo quebrado em toda a aplicação.
  for (const field of ['logo_url', 'logo_icon_url'] as const) {
    const value = patch[field]
    if (!value) continue
    try {
      const { protocol } = new URL(value)
      if (protocol !== 'https:' && protocol !== 'http:') throw new Error()
    } catch {
      return { ok: false, error: 'Informe uma URL de imagem válida, começando com https://' }
    }
  }

  const { error } = await supabase.from('settings').update(patch).eq('id', true)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function closeMonthAction(period?: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('fn_close_month', { p_period: period ?? null })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin')
  revalidatePath('/admin/usuarios')
  return { ok: true }
}

/** Sugestão de melhoria enviada pelo afiliado. */
export async function submitSuggestionAction(message: string): Promise<ActionResult> {
  const text = message.trim()
  if (text.length < 10) return { ok: false, error: 'Descreva sua sugestão com pelo menos 10 caracteres.' }
  if (text.length > 2000) return { ok: false, error: 'Sua sugestão passou de 2000 caracteres.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirada.' }

  const { error } = await supabase.from('app_suggestions').insert({ user_id: user.id, message: text })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/perfil')
  return { ok: true }
}

/** Envia o e-mail de redefinição de senha para o próprio usuário logado. */
export async function requestPasswordResetAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Sessão expirada.' }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${base}/login`,
  })
  if (error) return { ok: false, error: error.message }

  return { ok: true }
}

/** Define o link de indicação. Só pode ser feito uma vez (RPC valida). */
export async function changeUsernameAction(username: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('change_my_username', { p_username: username.trim().toLowerCase() })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/perfil')
  revalidatePath('/dashboard')
  return { ok: true }
}
