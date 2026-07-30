'use client'

import { useActionState } from 'react'
import type { ActionResult } from '@/lib/actions/sales'

export function SubmitForm({ action, children, label }: { action: (data: FormData) => Promise<ActionResult>; children: React.ReactNode; label: string }) {
  const [state, formAction, pending] = useActionState(async (_: ActionResult | null, data: FormData) => action(data), null)
  return <form action={formAction} className="space-y-3">{children}<button disabled={pending} className="rounded-xl bg-gold-500 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? 'Processando…' : label}</button>{state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}{state?.ok && <p className="text-sm text-emerald-700">Salvo com sucesso.</p>}</form>
}
