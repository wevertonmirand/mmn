'use client'

import { useState, useTransition } from 'react'
import { CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { closeMonthAction } from '@/lib/actions/admin'

export function CloseMonthButton() {
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const run = () => {
    startTransition(async () => {
      const result = await closeMonthAction()
      setMessage(result.ok ? 'Fechamento executado.' : result.error)
      setConfirming(false)
    })
  }

  if (!confirming) {
    return (
      <div className="flex items-center gap-3">
        {message && <span className="text-xs text-gray-500">{message}</span>}
        <Button variant="outline" onClick={() => setConfirming(true)}>
          <CalendarCheck className="h-4 w-4" aria-hidden />
          Fechar mês anterior
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">
        Aplica ativação e rebaixamentos de graduação. Confirmar?
      </span>
      <Button variant="gold" disabled={isPending} onClick={run} className="py-2 text-xs">
        {isPending ? 'Executando...' : 'Confirmar'}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)} className="py-2 text-xs">
        Cancelar
      </Button>
    </div>
  )
}
