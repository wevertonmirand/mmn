'use client'

import { useState, useTransition } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { saveCommissionsAction } from '@/lib/actions/internal-commerce'
import { cn } from '@/lib/utils'

const LEVELS = [1, 2, 3, 4, 5] as const

/**
 * Inputs controlados de propósito.
 *
 * Com `defaultValue` num formulário de Server Action, o React 19 devolve os
 * campos ao valor inicial quando a ação termina — o percentual salvo sumia da
 * tela e reaparecia o antigo, dando a impressão de que nada foi gravado.
 * Mantendo o valor em estado, o que ficou salvo é o que continua visível.
 */
export function CommissionForm({ initial }: { initial: number[] }) {
  const [values, setValues] = useState<string[]>(initial.map((v) => String(v)))
  const [saved, setSaved] = useState<number[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const numbers = values.map((v) => Number(String(v).replace(',', '.')))
  const total = numbers.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
  const invalid = numbers.some((n) => !Number.isFinite(n) || n < 0) || total > 100

  const dirty = values.some((v, i) => Number(v) !== (saved ?? initial)[i])

  const save = () => {
    setError(null)
    const data = new FormData()
    numbers.forEach((n, i) => data.set(`level_${i + 1}`, String(n)))

    startTransition(async () => {
      const result = await saveCommissionsAction(data)
      if (result.ok) {
        setSaved(numbers)
        setValues(numbers.map((n) => String(n)))
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Card>
      <CardTitle>Comissões da rede</CardTitle>
      <p className="mt-1 text-sm text-gray-500">
        Percentual pago a cada nível da upline sobre o valor do pedido. Fica gravado como snapshot
        no momento da compra, então mudanças aqui não alteram comissões já pagas.
      </p>

      <div className="mt-4 space-y-2">
        {LEVELS.map((level, index) => (
          <label
            key={level}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
          >
            <span className="text-sm font-medium text-gray-900">Nível {level}</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={values[index]}
                onChange={(event) => {
                  const next = [...values]
                  next[index] = event.target.value
                  setValues(next)
                  setError(null)
                }}
                className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right text-sm focus:border-gold-400 focus:outline-none"
              />
              <span className="text-sm text-gray-400">%</span>
            </span>
          </label>
        ))}
      </div>

      <div
        className={cn(
          'mt-3 flex items-center justify-between rounded-2xl px-4 py-3 text-sm',
          total > 100 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-gray-600',
        )}
      >
        <span>Total distribuído</span>
        <strong>{total.toFixed(2)}%</strong>
      </div>
      {total > 100 && (
        <p className="mt-1 text-xs text-red-600">A soma dos cinco níveis não pode passar de 100%.</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={isPending || invalid || !dirty} className="py-3 text-xs">
          {isPending ? 'Salvando...' : 'Salvar percentuais'}
        </Button>
        {saved && !dirty && (
          <span className="text-sm font-medium text-emerald-600">Salvo!</span>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  )
}
