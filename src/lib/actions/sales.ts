'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createSaleAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const productName = String(formData.get('product_name') ?? '').trim()
  const quantity = Number(formData.get('quantity') ?? 1)
  const basePoints = Number(formData.get('base_points') ?? 0)
  const customerName = String(formData.get('customer_name') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!productName) return { ok: false, error: 'Informe o nome do produto.' }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: 'Quantidade deve ser um número inteiro maior que zero.' }
  }
  if (!Number.isInteger(basePoints) || basePoints < 0) {
    return { ok: false, error: 'Pontos devem ser um número inteiro não negativo.' }
  }

  const { error } = await supabase.from('sales').insert({
    user_id: user.id,
    product_name: productName,
    quantity,
    base_points: basePoints,
    customer_name: customerName || null,
    notes: notes || null,
    status: 'ativa',
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/vendas')
  revalidatePath('/dashboard')
  return { ok: true }
}

/**
 * Não deleta a venda: muda para `pendente_cancelamento` e aguarda o admin.
 * O estorno de pontos na rede só acontece na aprovação.
 */
export async function requestSaleCancellationAction(
  saleId: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('request_sale_cancellation', {
    p_sale_id: saleId,
    p_reason: reason.trim() || null,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/vendas')
  return { ok: true }
}
