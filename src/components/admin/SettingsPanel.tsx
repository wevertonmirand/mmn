'use client'

import { useState, useTransition } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { updateSettingsAction } from '@/lib/actions/admin'
import { cn } from '@/lib/utils'
import type { Settings, ThemeName } from '@/lib/types'

const THEMES: { value: ThemeName; label: string; swatch: string }[] = [
  { value: 'gold', label: 'Dourado', swatch: 'bg-gradient-gold' },
  { value: 'slate', label: 'Grafite', swatch: 'bg-gradient-to-br from-slate-500 to-slate-700' },
  { value: 'emerald', label: 'Esmeralda', swatch: 'bg-gradient-to-br from-emerald-400 to-emerald-600' },
]

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [gamification, setGamification] = useState(settings.gamification_enabled)
  const [theme, setTheme] = useState<ThemeName>(settings.theme)
  const [minProducts, setMinProducts] = useState(settings.min_products_monthly)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const save = (patch: Parameters<typeof updateSettingsAction>[0]) => {
    startTransition(async () => {
      const result = await updateSettingsAction(patch)
      setError(result.ok ? null : result.error)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Master switch</CardTitle>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">Gamificação</p>
            <p className="text-sm text-gray-500">
              Desligado, oculta barras de progresso, badges de rank e o botão de prêmio no painel dos
              afiliados.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={gamification}
            aria-label="Ligar ou desligar gamificação"
            disabled={isPending}
            onClick={() => {
              const next = !gamification
              setGamification(next)
              save({ gamification_enabled: next })
            }}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
              gamification ? 'accent-gradient' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200',
                gamification ? 'left-6' : 'left-1',
              )}
            />
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle>Paleta de cores</CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => {
                setTheme(option.value)
                save({ theme: option.value })
              }}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all hover:scale-105',
                theme === option.value
                  ? 'border-gold-400 bg-gold-50 text-gray-900'
                  : 'border-slate-200 bg-white text-gray-600',
              )}
            >
              <span className={cn('h-4 w-4 rounded-full', option.swatch)} />
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Regra de ativação</CardTitle>
        <p className="mt-2 text-sm text-gray-500">
          Mínimo de produtos por mês. Três meses consecutivos abaixo da meta marcam o afiliado como
          inativo.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={1}
            value={minProducts}
            onChange={(event) => setMinProducts(Number(event.target.value))}
            className="w-28 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none"
          />
          <Button
            disabled={isPending}
            onClick={() => save({ min_products_monthly: minProducts })}
            className="py-3 text-xs"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}
    </div>
  )
}
