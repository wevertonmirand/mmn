import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { formatBRL, formatPoints } from '@/lib/utils'
import type { AdminStats } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_admin_stats')
  const stats = (data ?? {}) as Partial<AdminStats>

  const tiles = [
    { label: 'Pedidos novos', value: stats.new_orders ?? 0, href: '/admin/pedidos' },
    { label: 'Pedidos em aberto', value: stats.open_orders ?? 0, href: '/admin/pedidos' },
    { label: 'Faturado no mês', value: formatBRL(stats.orders_revenue_month ?? 0) },
    { label: 'Produtos ativos', value: stats.active_products ?? 0, href: '/admin/produtos' },
    { label: 'Afiliados ativos', value: stats.active_users ?? 0 },
    { label: 'Inativos', value: stats.inactive_users ?? 0 },
    { label: 'Em risco (2 meses)', value: stats.at_risk_users ?? 0, href: '/admin/usuarios' },
    { label: 'Cancelamentos pendentes', value: stats.pending_cancellations ?? 0, href: '/admin/cancelamentos' },
    { label: 'Prêmios a entregar', value: stats.pending_prizes ?? 0, href: '/admin/premios' },
    { label: 'Produtos vendidos no mês', value: stats.sales_this_month ?? 0 },
    { label: 'Pontos gerados no mês', value: formatPoints(stats.points_this_month ?? 0) },
    { label: 'Clientes cadastrados', value: stats.total_customers ?? 0 },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const body = (
          <Card className="h-full transition-transform duration-200 hover:scale-105">
            <CardTitle>{tile.label}</CardTitle>
            <p className="mt-2 text-3xl font-extrabold text-gray-900">{tile.value}</p>
          </Card>
        )
        return tile.href ? (
          <Link key={tile.label} href={tile.href}>
            {body}
          </Link>
        ) : (
          <div key={tile.label}>{body}</div>
        )
      })}
    </div>
  )
}
