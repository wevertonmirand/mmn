'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createSaleAction } from '@/lib/actions/sales'

const FIELD =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 ' +
  'placeholder:text-gray-400 transition-colors focus:border-gold-400 focus:outline-none ' +
  'focus:ring-2 focus:ring-gold-500/30'

export function SaleForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createSaleAction(formData)
      if (result.ok) {
        formRef.current?.reset()
        setFeedback({ ok: true, text: 'Venda registrada e pontos distribuídos na rede.' })
      } else {
        setFeedback({ ok: false, text: result.error })
      }
    })
  }

  return (
    <Card>
      <CardTitle>Registrar venda</CardTitle>

      <form ref={formRef} action={submit} className="mt-4 space-y-3">
        <input name="product_name" placeholder="Produto vendido" required className={FIELD} />

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Quantidade</span>
            <input
              name="quantity"
              type="number"
              min={1}
              step={1}
              defaultValue={1}
              required
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Pontos (unidade)</span>
            <input
              name="base_points"
              type="number"
              min={0}
              step={1}
              required
              className={FIELD}
            />
          </label>
        </div>

        <input name="customer_name" placeholder="Cliente (opcional)" className={FIELD} />
        <textarea name="notes" placeholder="Observações (opcional)" rows={2} className={FIELD} />

        <Button type="submit" disabled={isPending} className="w-full">
          <Plus className="h-4 w-4" aria-hidden />
          {isPending ? 'Registrando...' : 'Registrar venda'}
        </Button>

        {feedback && (
          <p
            role="status"
            className={feedback.ok ? 'text-sm font-medium text-emerald-700' : 'text-sm font-medium text-red-600'}
          >
            {feedback.text}
          </p>
        )}
      </form>
    </Card>
  )
}
