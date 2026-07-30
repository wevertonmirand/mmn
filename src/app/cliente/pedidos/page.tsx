import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { OrderStatusBadge } from '@/components/loja/OrderStatusBadge'
import { formatBRL, formatDateTime } from '@/lib/utils'
import type { Order, OrderItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

type OrderWithItems = Order & { order_items: OrderItem[] }

export default async function MeusPedidosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('orders')
    .select('*, order_items(product_name, quantity, unit_price_cents, unit_points)')
    .order('created_at', { ascending: false })

  const orders = (data ?? []) as unknown as OrderWithItems[]

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meus pedidos</h1>
        <Link href="/loja" className="text-sm font-semibold accent-text">
          Voltar à loja
        </Link>
      </header>

      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">
            Você ainda não fez pedidos.{' '}
            <Link href="/loja" className="font-semibold accent-text">
              Ver produtos
            </Link>
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Pedido #{order.order_number}</h2>
                  <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                {order.order_items.map((item, index) => (
                  <li key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.quantity}× {item.product_name}
                    </span>
                    <span className="text-gray-900">
                      {formatBRL(item.unit_price_cents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span className="text-sm font-medium text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatBRL(order.total_cents)}
                </span>
              </div>

              {order.status === 'novo' && (
                <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
                  Recebemos seu pedido. Em breve entraremos em contato pelo telefone{' '}
                  {order.contact_phone}.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
