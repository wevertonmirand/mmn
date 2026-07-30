'use client'

import { useState, useTransition } from 'react'
import { PackageCheck } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { reviewPrizeRequestAction } from '@/lib/actions/admin'
import { formatDate, formatPoints } from '@/lib/utils'
import type { PrizeRequestRow } from '@/lib/types'

export function PrizeQueue({ requests }: { requests: PrizeRequestRow[] }) {
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const review = (id: string, status: 'entregue' | 'recusado') => {
    setBusyId(id)
    setError(null)
    startTransition(async () => {
      const result = await reviewPrizeRequestAction(id, status)
      if (!result.ok) setError(result.error)
      setBusyId(null)
    })
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Solicitações de prêmio</CardTitle>
        <Badge tone="slate">{requests.length}</Badge>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {requests.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Nenhuma solicitação registrada.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{request.prize_name}</p>
                <p className="text-sm text-gray-500">
                  @{request.username} · {request.full_name}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatPoints(request.points_at_time)} pts na solicitação ·{' '}
                  {formatDate(request.requested_at)}
                  {request.phone && ` · ${request.phone}`}
                </p>
              </div>

              {request.status === 'solicitado' ? (
                <div className="flex gap-2">
                  <Button
                    disabled={isPending && busyId === request.id}
                    onClick={() => review(request.id, 'entregue')}
                    className="py-2 text-xs"
                  >
                    <PackageCheck className="h-4 w-4" aria-hidden />
                    Marcar como entregue
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending && busyId === request.id}
                    onClick={() => review(request.id, 'recusado')}
                    className="py-2 text-xs"
                  >
                    Recusar
                  </Button>
                </div>
              ) : (
                <Badge tone={request.status === 'entregue' ? 'green' : 'slate'}>
                  {request.status === 'entregue' ? 'Entregue' : 'Recusado'}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
