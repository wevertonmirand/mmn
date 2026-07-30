'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

/**
 * O sponsor vem do ?ref= do link de indicação e é resolvido no banco pelo
 * trigger de signup — o cliente não escolhe onde entra na árvore.
 */
export function SignupForm({ sponsorUsername }: { sponsorUsername: string | null }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = (formData: FormData) => {
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')
    const fullName = String(formData.get('full_name') ?? '').trim()
    const username = String(formData.get('username') ?? '').trim().toLowerCase()

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      setError('Usuário deve ter 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, username, sponsor_username: sponsorUsername },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      router.replace('/dashboard')
      router.refresh()
    })
  }

  return (
    <Card>
      {sponsorUsername && (
        <p className="mb-4 rounded-2xl bg-gradient-gold-soft px-4 py-3 text-sm text-gold-800">
          Você foi indicado por <strong>@{sponsorUsername}</strong>
        </p>
      )}

      <form action={submit} className="space-y-3">
        <input name="full_name" placeholder="Nome completo" required className={FIELD} />
        <input name="username" placeholder="Usuário (seu link)" required className={FIELD} />
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
