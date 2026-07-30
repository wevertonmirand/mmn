'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

/**
 * role: 'customer' no metadata faz o trigger de signup criar a linha em
 * `customers` em vez de `users` — o cliente não entra na árvore de
 * afiliados e não gera pontos de recrutamento.
 */
export function CustomerSignupForm({ sponsorUsername }: { sponsorUsername: string | null }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        options: {
          data: {
            role: 'customer',
            full_name: String(formData.get('full_name') ?? '').trim(),
            phone: String(formData.get('phone') ?? '').trim(),
            sponsor_username: sponsorUsername,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      router.replace(sponsorUsername ? `/loja/${sponsorUsername}` : '/loja')
      router.refresh()
    })
  }

  return (
    <Card>
      {sponsorUsername && (
        <p className="mb-4 rounded-2xl bg-gradient-gold-soft px-4 py-3 text-sm text-gold-800">
          Comprando com <strong>@{sponsorUsername}</strong>
        </p>
      )}

      <form action={submit} className="space-y-3">
        <input name="full_name" placeholder="Nome completo" required className={FIELD} />
        <input name="phone" placeholder="Telefone / WhatsApp" required className={FIELD} />
        <input name="email" type="email" placeholder="E-mail" required className={FIELD} />
        <input
          name="password"
          type="password"
          placeholder="Senha (mín. 6 caracteres)"
          required
          minLength={6}
          className={FIELD}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Criando conta...' : 'Criar conta'}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </Card>
  )
}
