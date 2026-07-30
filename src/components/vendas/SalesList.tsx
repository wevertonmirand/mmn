'use client'

import { useState, useTransition } from 'react'
import { Clock, Ban, CheckCircle2 } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { requestSaleCancellationAction } from '@/lib/actions/sales'
import { formatDate, formatPoints } from '@/lib/utils'
import type { Sale } from '@/lib/types'

const STATUS_LABEL: Record<Sale['status'], string> = {
  ativa: 'Ativa',
  pendente_cancelamento: 'Cancelamento em análise',
  cancelada: 'Cancelada',
}

export function SalesList({ sales }: { sales: Sale[] }) {
  const [targetId, setTargetId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const confirmCancel = (saleId: string) => {
    startTransition(async () => {
      const result = await requestSaleCancellationAction(saleId, reason)
      if (result.ok) {
        setTargetId(null)
        setReason('')
        setError(null)
      } else {
        setError(result.error)
      }
    })
  }

  if (sales.length === 0) {
    return (
      <Card>
        <CardTitle>Minhas vendas</CardTitle>
        <p className="mt-3 text-sm text-gray-500">
          Nenhuma venda registrada ainda. Use o formulário acima para lançar a primeira.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <CardTitle>Minhas vendas</CardTitle>

      <ul className="mt-4 divide-y divide-slate-100">
        {sales.map((sale) => (
          <li key={sale.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{sale.product_name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDate(sale.sold_at)} · {sale.quantity}x ·{' '}
                  {formatPoints(sale.quantity * sale.base_points)} pts
                </p>
                {sale.customer_name && (
                  <p className="mt-0.5 text-xs text-gray-400">Cliente: {sale.customer_name}</p>
                )}
              </div>

              {sale.status === 'ativa' && (
                <Badge tone="green">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  {STATUS_LABEL.ativa}
                </Badge>
              )}
              {sale.status === 'pendente_cancelamento' && (
                <Badge tone="amber">
                  <Clock className="h-3 w-3" aria-hidden />
                  Em análise
                </Badge>
              )}
              {sale.status === 'cancelada' && (
                <Badge tone="slate">
                  <Ban className="h-3 w-3" aria-hidden />
                  {STATUS_LABEL.cancelada}
                </Badge>
              )}
            </div>

            {sale.status === 'ativa' && targetId !== sale.id && (
              <Button
                variant="ghost"
                onClick={() => {
                  setTargetId(sale.id)
                  setError(null)
                }}
                className="mt-2 px-0 text-xs text-gray-500 hover:text-red-600"
              >
                Solicitar cancelamento
              </Button>
            )}

            {targetId === sale.id && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-gray-600">
                  A venda não é excluída: ela fica <strong>pendente de cancelamento</strong> até um
                  administrador aprovar. Os pontos só são estornados após a aprovação.
                </p>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Motivo (opcional)"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="danger"
                    disabled={isPending}
                    onClick={() => confirmCancel(sale.id)}
                    className="flex-1 py-2 text-xs"
                  >
                    {isPending ? 'Enviando...' : 'Confirmar solicitação'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTargetId(null)}
                    className="flex-1 py-2 text-xs"
                  >
                    Voltar
                  </Button>
                </div>
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              </div>
            )}

            {sale.status === 'pendente_cancelamento' && sale.cancel_reason && (
              <p className="mt-2 text-xs text-amber-700">Motivo: {sale.cancel_reason}</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
