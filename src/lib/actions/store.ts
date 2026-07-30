'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/actions/sales'
import type { CartLine, PlacedOrder } from '@/lib/types'

type PlaceOrderResult = { ok: true; order: PlacedOrder } | { ok: false; error: string }

/**
 * O carrinho enviado carrega apenas product_id e quantidade. Preço e
 * pontuação são recalculados pelo banco em place_order — o cliente não
 * consegue influenciar o valor do pedido nem os pontos da rede.
 */
export async function placeOrderAction(
  cart: CartLine[],
  phone: string,
  address: string,
  notes: string,
  ref: string | null,
): Promise<PlaceOrderResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Entre na sua conta para finalizar o pedido.' }

  if (cart.length === 0) return { ok: false, error: 'Seu carrinho está vazio.' }
  if (!phone.trim()) return { ok: false, error: 'Informe um telefone para contato.' }

  const items = cart.map((line) => ({
    product_id: line.product_id,
    quantity: line.quantity,
  }))

  const { data, error } = await supabase.rpc('place_order', {
    p_items: items,
    p_phone: phone.trim(),
    p_address: address.trim() || null,
    p_notes: notes.trim() || null,
    p_ref: ref,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/cliente/pedidos')
  revalidatePath('/admin/pedidos')
  return { ok: true, order: data as unknown as PlacedOrder }
}

export async function upsertProductAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const sku = String(formData.get('sku') ?? '').trim()
  const priceReais = Number(String(formData.get('price') ?? '0').replace(',', '.'))
  const pointsValue = Number(formData.get('points_value') ?? 0)
  const imageUrl = String(formData.get('image_url') ?? '').trim()
  const isActive = formData.get('is_active') === 'on'

  if (!name) return { ok: false, error: 'Informe o nome do produto.' }
  if (!Number.isFinite(priceReais) || priceReais < 0) {
    return { ok: false, error: 'Preço inválido.' }
  }
  if (!Number.isInteger(pointsValue) || pointsValue < 0) {
    return { ok: false, error: 'Pontos devem ser um inteiro não negativo.' }
  }

  const payload = {
    name,
    description: description || null,
    sku: sku || null,
    price_cents: Math.round(priceReais * 100),
    points_value: pointsValue,
    image_url: imageUrl || null,
    is_active: isActive,
  }

  const { error } = id
    ? await supabase.from('products').update(payload).eq('id', id)
    : await supabase.from('products').insert(payload)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/produtos')
  revalidatePath('/loja')
  return { ok: true }
}

type OrderAction = 'contatar' | 'fechar' | 'cancelar'

const RPC_BY_ACTION: Record<OrderAction, 'mark_order_contacted' | 'close_order' | 'cancel_order'> = {
  contatar: 'mark_order_contacted',
  fechar: 'close_order',
  cancelar: 'cancel_order',
}

/** Fechar gera as vendas e distribui os pontos; cancelar um pedido já
 *  fechado estorna. Ambos são resolvidos por RPC no banco. */
export async function reviewOrderAction(
  orderId: string,
  action: OrderAction,
  notes?: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc(RPC_BY_ACTION[action], {
    p_order_id: orderId,
    p_notes: notes?.trim() || null,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/pedidos')
  revalidatePath('/admin')
  return { ok: true }
}
