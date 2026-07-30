'use client'

import { useState, useTransition } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { reviewCancellationAction } from '@/lib/actions/admin'
import { formatDate, formatPoints } from '@/lib/utils'
import type { PendingCancellation } from '@/lib/types'

export function CancellationQueue({ items }: { items: PendingCancellation[] }) {
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const review = (saleId: string, approve: boolean) => {
    setBusyId(saleId)
    setError(null)
    startTransition(async () => {
      const result = await reviewCancellationAction(saleId, approve)
      if (!result.ok) setError(result.error)
      setBusyId(null)
    })
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardTitle>Cancelamentos</CardTitle>
        <p className="mt-3 text-sm text-gray-500">Nenhuma solicitação aguardando revisão.</p>
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

      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900">{item.product_name}</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                @{item.username} · {item.full_name}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Vendida em {formatDate(item.sold_at)} · solicitado em{' '}
                {formatDate(item.cancel_requested_at)}
              </p>
              {item.cancel_reason && (
                <p className="mt-2 text-sm text-gray-600">Motivo: {item.cancel_reason}</p>
              )}
            </div>

            <div className="text-right">
              <Badge tone="amber">
                −{formatPoints(item.points_to_reverse)} pts
              </Badge>
              <p className="mt-1 text-xs text-gray-500">
                {item.affected_users} usuário{item.affected_users === 1 ? '' : 's'} na rede
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="danger"
              disabled={isPending && busyId === item.id}
              onClick={() => review(item.id, true)}
            >
              {isPending && busyId === item.id ? 'Processando...' : 'Aprovar e estornar'}
            </Button>
            <Button
              variant="outline"
              disabled={isPending && busyId === item.id}
              onClick={() => review(item.id, false)}
            >
              Recusar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
