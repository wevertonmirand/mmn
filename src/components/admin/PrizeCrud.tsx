'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { upsertPrizeAction } from '@/lib/actions/admin'
import { formatPoints } from '@/lib/utils'
import type { Prize } from '@/lib/types'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

export function PrizeCrud({ prizes }: { prizes: Prize[] }) {
  const [editing, setEditing] = useState<Prize | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await upsertPrizeAction(formData)
      if (result.ok) {
        setEditing(null)
        setCreating(false)
        setError(null)
      } else {
        setError(result.error)
      }
    })
  }

  const showForm = creating || editing !== null

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Catálogo de prêmios</CardTitle>
        {!showForm && (
          <Button
            variant="outline"
            onClick={() => {
              setCreating(true)
              setEditing(null)
            }}
            className="py-2 text-xs"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Novo prêmio
          </Button>
        )}
      </div>

      {showForm && (
        <form action={submit} className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
          <input type="hidden" name="id" value={editing?.id ?? ''} />
          <input
            name="name"
            defaultValue={editing?.name ?? ''}
            placeholder="Nome do prêmio"
            required
            className={FIELD}
          />
          <textarea
            name="description"
            defaultValue={editing?.description ?? ''}
            placeholder="Descrição"
            rows={2}
            className={FIELD}
          />
          <input
            name="required_points"
            type="number"
            min={1}
            step={1}
            defaultValue={editing?.required_points ?? ''}
            placeholder="Pontos necessários"
            required
            className={FIELD}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editing?.is_active ?? true}
              className="h-4 w-4 rounded accent-gold-500"
            />
            Ativo (visível para os afiliados)
          </label>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="py-2 text-xs">
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreating(false)
                setEditing(null)
                setError(null)
              }}
              className="py-2 text-xs"
            >
              Cancelar
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {prizes.map((prize) => (
          <li key={prize.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{prize.name}</p>
              <p className="text-xs text-gray-500">
                {formatPoints(prize.required_points)} pts
                {prize.description && ` · ${prize.description}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!prize.is_active && <Badge tone="slate">Inativo</Badge>}
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(prize)
                  setCreating(false)
                }}
                className="p-2"
                aria-label={`Editar ${prize.name}`}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
