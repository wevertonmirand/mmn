'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, MessageCircle, Phone, XCircle } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { OrderStatusBadge } from '@/components/loja/OrderStatusBadge'
import { reviewOrderAction } from '@/lib/actions/store'
import { formatBRL, formatDateTime, formatPoints, whatsappLink } from '@/lib/utils'
import type { AdminOrder } from '@/lib/types'

export function OrderQueue({ orders }: { orders: AdminOrder[] }) {
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notesFor, setNotesFor] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const review = (orderId: string, action: 'contatar' | 'fechar' | 'cancelar') => {
    setBusyId(orderId)
    setError(null)
    startTransition(async () => {
      const result = await reviewOrderAction(orderId, action, notes)
      if (!result.ok) setError(result.error)
      else {
        setNotesFor(null)
        setNotes('')
      }
      setBusyId(null)
    })
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardTitle>Pedidos</CardTitle>
        <p className="mt-3 text-sm text-gray-500">Nenhum pedido recebido ainda.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {orders.map((order) => {
        const busy = isPending && busyId === order.id
        const open = order.status === 'novo' || order.status === 'em_contato'

        return (
          <Card key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">Pedido #{order.order_number}</h2>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {order.contact_name} · {order.contact_phone}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDateTime(order.created_at)}
                  {order.referred_by_username
                    ? ` · indicado por @${order.referred_by_username}`
                    : ' · sem afiliado (venda da casa)'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatBRL(order.total_cents)}</p>
                <Badge tone="gold" className="mt-1">
                  {formatPoints(order.total_points)} pts
                </Badge>
              </div>
            </div>

            <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity}× {item.product_name}
                  </span>
                  <span className="text-gray-500">
                    {formatBRL(item.unit_price_cents * item.quantity)} ·{' '}
                    {formatPoints(item.unit_points * item.quantity)} pts
                  </span>
                </li>
              ))}
            </ul>

            {order.address && (
              <p className="mt-2 text-xs text-gray-500">Entrega: {order.address}</p>
            )}
            {order.customer_notes && (
              <p className="mt-1 text-xs text-gray-500">Obs. do cliente: {order.customer_notes}</p>
            )}
            {order.admin_notes && (
              <p className="mt-1 text-xs accent-text">Nota interna: {order.admin_notes}</p>
            )}

            {!order.referred_by_username && open && (
              <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
                Este pedido não tem afiliado vinculado, então fechá-lo não distribui pontos na rede.
              </p>
            )}

            {open && (
              <div className="mt-4 space-y-2">
                {notesFor === order.id && (
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Nota interna (opcional)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <a
                    href={whatsappLink(
                      order.contact_phone,
                      `Olá ${order.contact_name}! Recebemos seu pedido #${order.order_number} no valor de ${formatBRL(order.total_cents)}. Podemos combinar o pagamento e a entrega?`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-transform hover:scale-105"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    WhatsApp
                  </a>
                  <a
                    href={`tel:${order.contact_phone.replace(/\D/g, '')}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-transform hover:scale-105"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    Ligar
                  </a>

                  {order.status === 'novo' && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setNotesFor(order.id)
                        review(order.id, 'contatar')
                      }}
                      className="py-2 text-xs"
                    >
                      Marcar em contato
                    </Button>
                  )}

                  <Button disabled={busy} onClick={() => review(order.id, 'fechar')} className="py-2 text-xs">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {busy ? 'Processando...' : 'Fechar venda'}
                  </Button>

                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => review(order.id, 'cancelar')}
                    className="py-2 text-xs"
                  >
                    <XCircle className="h-4 w-4" aria-hidden />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {order.status === 'fechado' && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <p className="flex-1 text-xs text-emerald-700">
                  Venda fechada em {order.closed_at && formatDateTime(order.closed_at)}.
                  {order.referred_by_username
                    ? ` ${formatPoints(order.total_points)} pts distribuídos na rede de @${order.referred_by_username}.`
                    : ' Sem afiliado vinculado, nenhum ponto distribuído.'}
                </p>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => review(order.id, 'cancelar')}
                  className="py-2 text-xs"
                >
                  Cancelar e estornar
                </Button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
