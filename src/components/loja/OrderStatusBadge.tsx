import { Badge } from '@/components/ui/Badge'
import type { OrderStatus } from '@/lib/types'

const CONFIG: Record<OrderStatus, { label: string; tone: 'amber' | 'gold' | 'green' | 'slate' }> = {
  novo: { label: 'Novo', tone: 'amber' },
  em_contato: { label: 'Em contato', tone: 'gold' },
  fechado: { label: 'Venda fechada', tone: 'green' },
  cancelado: { label: 'Cancelado', tone: 'slate' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = CONFIG[status]
  return <Badge tone={tone}>{label}</Badge>
}
