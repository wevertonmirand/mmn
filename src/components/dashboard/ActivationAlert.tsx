import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { progressPercent } from '@/lib/utils'
import type { DashboardPayload } from '@/lib/types'

interface ActivationAlertProps {
  activation: DashboardPayload['activation']
  isInactive: boolean
  inactiveStreak: number
}

export function ActivationAlert({ activation, isInactive, inactiveStreak }: ActivationAlertProps) {
  const { products_this_month: sold, min_required: required, is_active_this_month: active } = activation

  if (isInactive) {
    return (
      <Card className="border-red-200 bg-red-50">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div>
            <h2 className="font-semibold text-red-900">Conta inativa</h2>
            <p className="mt-1 text-sm text-red-800">
              Você ficou 3 meses sem atingir a meta de ativação e não está recebendo pontos da sua
              rede. Registre {required} produto{required === 1 ? '' : 's'} este mês para reativar.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (activation.at_risk && !active) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-amber-900">
              Risco de inatividade — {inactiveStreak}º mês
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Mais um mês sem ativação e sua conta será marcada como inativa, deixando de receber
              pontos da rede. Faltam <strong>{Math.max(0, required - sold)}</strong> produto
              {required - sold === 1 ? '' : 's'}.
            </p>
            <ProgressBar
              value={progressPercent(sold, required)}
              label="Progresso de ativação"
              className="mt-3 bg-amber-100"
            />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            {active && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
            {active ? 'Ativo neste mês' : 'Ativação pendente'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {sold} de {required} produto{required === 1 ? '' : 's'} registrado
            {sold === 1 ? '' : 's'}
          </p>
        </div>
        <span className="text-2xl font-bold accent-text">
          {progressPercent(sold, required)}%
        </span>
      </div>
      <ProgressBar
        value={progressPercent(sold, required)}
        label="Progresso de ativação"
        className="mt-3"
      />
    </Card>
  )
}
