'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { changeUsernameAction } from '@/lib/actions/internal-commerce'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/

export function ReferralUsernameForm({ currentUsername }: { currentUsername: string }) {
  const [username, setUsername] = useState(currentUsername)
  const [available, setAvailable] = useState<boolean | null>(true)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const validFormat = USERNAME_PATTERN.test(username.trim().toLowerCase())

  useEffect(() => {
    const candidate = username.trim().toLowerCase()
    if (!USERNAME_PATTERN.test(candidate)) return

    const timer = window.setTimeout(async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('is_username_available', {
        p_username: candidate,
      })
      setAvailable(!error && data === true)
      setChecking(false)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [username])

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await changeUsernameAction(formData)
      setMessage(result.ok ? 'Nome e links atualizados com sucesso.' : result.error)
    })
  }

  return (
    <Card>
      <CardTitle>Nome do link de indicação</CardTitle>
      <p className="mt-1 text-xs text-gray-500">
        Este nome aparece em seus links de cadastro e loja. Links antigos deixam de funcionar após a alteração.
      </p>
      <form action={submit} className="mt-3 space-y-3">
        <div className="relative">
          <input
            name="username"
            value={username}
            onChange={(event) => {
              const value = event.target.value.toLowerCase()
              setUsername(value)
              setAvailable(null)
              setChecking(USERNAME_PATTERN.test(value.trim()))
            }}
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9._-]{3,30}"
            required
            aria-describedby="username-status"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          />
          <span className="absolute right-3 top-3 text-gray-400">
            {checking ? <LoaderCircle className="h-5 w-5 animate-spin" /> : available && validFormat ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
          </span>
        </div>
        <p id="username-status" className={`text-xs ${available ? 'text-emerald-700' : 'text-red-600'}`}>
          {checking ? 'Verificando disponibilidade…' : available && validFormat ? 'Nome disponível.' : 'Nome inválido ou indisponível.'}
        </p>
        <Button type="submit" disabled={pending || checking || !available || !validFormat} className="w-full">
          {pending ? 'Salvando…' : 'Atualizar meus links'}
        </Button>
        {message && <p className="text-sm text-gray-700">{message}</p>}
      </form>
    </Card>
  )
}
