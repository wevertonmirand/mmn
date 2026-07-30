'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, UserCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

/**
 * Não existe campo para digitar link de indicação: o patrocinador vem do
 * ?ref= e é resolvido no banco, então ninguém escolhe onde entra na árvore.
 *
 * Sem link, o cadastro exige marcar "Ninguém me indicou" — uma confirmação
 * explícita, para quem tem link não perder o patrocinador por descuido. O
 * banco então direciona ao afiliado mais capacitado (fn_pick_best_sponsor).
 */
export function SignupForm({ sponsorUsername }: { sponsorUsername: string | null }) {
  const router = useRouter()
  const [noSponsor, setNoSponsor] = useState(false)
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

    if (!sponsorUsername && !noSponsor) {
      setError('Marque "Ninguém me indicou" para continuar sem link de indicação.')
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

      router.replace('/')
      router.refresh()
    })
  }

  return (
    <Card>
      {sponsorUsername ? (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-gradient-gold-soft px-4 py-3 text-sm text-gold-800">
          <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Você foi indicado por <strong>@{sponsorUsername}</strong>
          </span>
        </p>
      ) : (
        <div className="mb-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={noSponsor}
              onChange={(event) => {
                setNoSponsor(event.target.checked)
                setError(null)
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-gold-500"
            />
            <span className="text-sm font-medium text-gray-900">Ninguém me indicou</span>
          </label>

          {/* translúcido de propósito: informa sem competir com o formulário */}
          <p className="flex items-start gap-2 rounded-2xl bg-gold-500/10 px-4 py-3 text-xs text-gray-600/90">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-500/70" aria-hidden />
            <span>
              Você será direcionado para a pessoa mais capacitada da nossa equipe, que vai te
              acompanhar desde o início.
            </span>
          </p>
        </div>
      )}

      <form action={submit} className="space-y-3">
        <input name="full_name" placeholder="Nome completo" required className={FIELD} />

        <label className="block">
          <input
            name="username"
            placeholder="Escolha seu nome de usuário"
            required
            className={FIELD}
          />
          <span className="mt-1 block px-1 text-xs text-gray-400">
            Será o endereço da sua loja e do seu link de indicação.
          </span>
        </label>

        <input name="email" type="email" placeholder="E-mail" required className={FIELD} />
        <input
          name="password"
          type="password"
          placeholder="Senha (mín. 6 caracteres)"
          required
          minLength={6}
          className={FIELD}
        />

        <Button
          type="submit"
          disabled={isPending || (!sponsorUsername && !noSponsor)}
          className="w-full"
        >
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
