'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = (formData: FormData) => {
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    startTransition(async () => {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError('E-mail ou senha inválidos.')
        return
      }

      // '/' roteia por papel: admin vai para /admin, afiliado para
      // /dashboard, cliente para /loja.
      router.replace(searchParams.get('next') ?? '/')
      router.refresh()
    })
  }

  return (
    <Card>
      <form action={submit} className="space-y-3">
        <input name="email" type="email" placeholder="E-mail" required className={FIELD} />
        {/* Sem minLength: quem valida a senha é o servidor. Exigir tamanho
            aqui bloqueia o envio de contas com senha curta já existente. */}
        <input
          name="password"
          type="password"
          placeholder="Senha"
          required
          className={FIELD}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Entrando...' : 'Entrar'}
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
