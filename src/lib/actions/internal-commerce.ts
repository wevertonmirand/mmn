'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from './sales'

export async function placeInternalOrderAction(formData: FormData): Promise<ActionResult> {
  const productId = String(formData.get('product_id') ?? '')
  const quantity = Number(formData.get('quantity'))
  if (!productId || !Number.isInteger(quantity) || quantity < 1) return { ok: false, error: 'Produto ou quantidade inválida.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('place_internal_order', { p_items: [{ product_id: productId, quantity }] })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/pedidos'); return { ok: true }
}

export async function createCustomerAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirada.' }
  const name = String(formData.get('name') ?? '').trim(); if (!name) return { ok: false, error: 'Nome obrigatório.' }
  const { error } = await supabase.from('crm_customers').insert({ user_id: user.id, name, email: String(formData.get('email') ?? '') || null, phone: String(formData.get('phone') ?? '') || null })
  if (error) return { ok: false, error: error.message }; revalidatePath('/clientes'); return { ok: true }
}

export async function saveCommissionsAction(formData: FormData): Promise<ActionResult> {
  const values = Array.from({ length: 5 }, (_, index) => Number(formData.get(`level_${index + 1}`)))
  if (values.some((v) => !Number.isFinite(v) || v < 0) || values.reduce((a, b) => a + b, 0) > 100) return { ok: false, error: 'Percentuais inválidos: use valores positivos cuja soma seja até 100%.' }
  const patch = { commission_level_1: values[0], commission_level_2: values[1], commission_level_3: values[2], commission_level_4: values[3], commission_level_5: values[4] }
  const supabase = await createClient(); const { error } = await supabase.from('settings').update(patch).eq('id', true)
  if (error) {
    if (error.message.includes("commission_level_1") && error.message.includes('schema cache')) {
      return {
        ok: false,
        error: 'O banco ainda não publicou as colunas de comissão. Aplique as migrations 010 e 012 no Supabase e tente novamente.',
      }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/admin/comissoes'); return { ok: true }
}

export async function removeAffiliateAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient(); const { error } = await supabase.rpc('remove_affiliate', { p_user_id: String(formData.get('user_id')), p_reason: String(formData.get('reason') ?? '') })
  if (error) return { ok: false, error: error.message }; revalidatePath('/admin/usuarios'); return { ok: true }
}

export async function changeUsernameAction(formData: FormData): Promise<ActionResult> {
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return { ok: false, error: 'Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('change_my_username', { p_username: username })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/rede')
  return { ok: true }
}
