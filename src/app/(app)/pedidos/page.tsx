import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { OrderStatusBadge } from '@/components/loja/OrderStatusBadge'
import { formatBRL, formatDateTime, formatPoints } from '@/lib/utils'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Pedidos que entraram pelo link da loja do afiliado. O RLS
 * (orders_select_referrer) devolve apenas os pedidos indicados por ele.
 */
export default async function PedidosIndicadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('referred_by', user!.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const orders = (data ?? []) as Order[]
  const closed = orders.filter((order) => order.status === 'fechado')
  const pointsEarned = closed.reduce((sum, order) => sum + order.total_points, 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pedidos da minha loja</h1>
        <p className="mt-1 text-sm text-gray-500">
          {orders.length} pedido{orders.length === 1 ? '' : 's'} · {closed.length} fechado
          {closed.length === 1 ? '' : 's'} · {formatPoints(pointsEarned)} pts gerados
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">
            Nenhum pedido ainda. Compartilhe o link da sua loja para começar a receber.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">Pedido #{order.order_number}</h2>
                  <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                  <p className="mt-1 text-sm text-gray-600">{order.contact_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <OrderStatusBadge status={order.status} />
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatBRL(order.total_cents)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-gray-500">
                  {order.status === 'fechado'
                    ? 'Pontos creditados na sua rede'
                    : order.status === 'cancelado'
                      ? 'Pedido cancelado'
                      : 'Aguardando o contato da equipe'}
                </span>
                <Badge tone={order.status === 'fechado' ? 'green' : 'slate'}>
                  {formatPoints(order.total_points)} pts
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
