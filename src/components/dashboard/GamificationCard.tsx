'use client'

import { useState, useTransition } from 'react'
import { Gift, Sparkles, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { requestPrizeAction } from '@/lib/actions/prizes'
import { formatPoints, progressPercent } from '@/lib/utils'
import type { DashboardPayload } from '@/lib/types'

interface GamificationCardProps {
  points: number
  nextPrize: DashboardPayload['next_prize']
  claimablePrize: DashboardPayload['claimable_prize']
}

export function GamificationCard({ points, nextPrize, claimablePrize }: GamificationCardProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const claim = () => {
    if (!claimablePrize) return
    startTransition(async () => {
      const result = await requestPrizeAction(claimablePrize.id)
      setMessage(result.ok ? 'Solicitação enviada! O admin foi notificado.' : result.error)
    })
  }

  const remaining = nextPrize ? Math.max(0, nextPrize.required_points - points) : 0

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Seus pontos</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-gray-900">
            {formatPoints(points)}
          </p>
        </div>
        <span className="accent-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white">
          <TrendingUp className="h-5 w-5" aria-hidden />
        </span>
      </div>

      {claimablePrize ? (
        <div className="mt-5 rounded-2xl bg-gradient-gold-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gold-800">
            <Sparkles className="h-4 w-4" aria-hidden />
            Você desbloqueou: {claimablePrize.name}
          </p>
          <Button shine onClick={claim} disabled={isPending} className="mt-3 w-full">
            <Gift className="h-4 w-4" aria-hidden />
            {isPending ? 'Enviando...' : 'Solicitar Prêmio'}
          </Button>
        </div>
      ) : nextPrize ? (
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium text-gray-700">{nextPrize.name}</span>
            <span className="text-gray-500">
              {formatPoints(points)} / {formatPoints(nextPrize.required_points)}
            </span>
          </div>
          <ProgressBar
            value={progressPercent(points, nextPrize.required_points)}
            label={`Progresso para ${nextPrize.name}`}
          />
          <p className="mt-2 text-xs text-gray-500">
            Faltam <strong className="accent-text">{formatPoints(remaining)}</strong> pontos para o
            próximo prêmio.
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-gray-500">
          Você já conquistou todos os prêmios disponíveis. Novidades em breve.
        </p>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm font-medium accent-text">
          {message}
        </p>
      )}
    </Card>
  )
}
