'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, KeyRound, Lightbulb, Link2, Lock } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  changeUsernameAction,
  requestPasswordResetAction,
  submitSuggestionAction,
} from '@/lib/actions/admin'
import { referralLink, storeLink } from '@/lib/utils'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 truncate text-sm text-gray-900">{value}</p>
      <Button
        variant="outline"
        className="mt-2 w-full py-2 text-xs"
        aria-live="polite"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          } catch {
            setCopied(false)
          }
        }}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden /> Copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden /> Copiar
          </>
        )}
      </Button>
    </div>
  )
}

/** Link de indicação: escolhido uma única vez, com checagem de disponibilidade. */
export function ReferralLinkPanel({
  username,
  locked,
}: {
  username: string
  locked: boolean
}) {
  const [value, setValue] = useState(username)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(locked)
  const [isPending, startTransition] = useTransition()

  const clean = value.trim().toLowerCase()
  const valid = /^[a-z0-9._-]{3,30}$/.test(clean)

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await changeUsernameAction(clean)
      if (result.ok) setDone(true)
      else setError(result.error)
    })
  }

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <Link2 className="h-4 w-4 accent-text" aria-hidden />
          Seu link de indicação
        </span>
      </CardTitle>

      <div className="mt-3 space-y-2">
        <CopyRow label="Convidar afiliados" value={referralLink(done ? username : clean || username)} />
        <CopyRow label="Sua loja" value={storeLink(done ? username : clean || username)} />
      </div>

      {done ? (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-gray-600">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span>
            Seu nome já está definido como <strong>@{username}</strong> e não pode mais ser
            alterado — os links já foram divulgados e mudariam de endereço.
          </span>
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500">
            Você pode personalizar seu nome <strong>uma única vez</strong>. Depois disso ele fica
            fixo, para os links que você compartilhar continuarem funcionando.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Nome de indicação</span>
            <input
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setError(null)
              }}
              placeholder="seunome"
              className={FIELD}
            />
          </label>
          {!valid && clean.length > 0 && (
            <p className="text-xs text-amber-600">
              Use de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _.
            </p>
          )}
          <Button
            onClick={save}
            disabled={isPending || !valid || clean === username}
            className="w-full py-2 text-xs"
          >
            {isPending ? 'Verificando...' : 'Definir meu link (definitivo)'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </Card>
  )
}

export function PasswordPanel({ email }: { email: string }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 accent-text" aria-hidden />
          Senha
        </span>
      </CardTitle>
      <p className="mt-1 text-sm text-gray-500">
        Enviamos um link de redefinição para <strong>{email}</strong>.
      </p>

      <Button
        variant="outline"
        disabled={isPending || sent}
        className="mt-3 w-full py-2 text-xs"
        onClick={() =>
          startTransition(async () => {
            const result = await requestPasswordResetAction()
            if (result.ok) setSent(true)
            else setError(result.error)
          })
        }
      >
        {sent ? 'E-mail enviado!' : isPending ? 'Enviando...' : 'Redefinir minha senha'}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  )
}

export function SuggestionPanel() {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 accent-text" aria-hidden />
          Sugerir uma melhoria
        </span>
      </CardTitle>
      <p className="mt-1 text-sm text-gray-500">
        O que faria o app funcionar melhor para você? A equipe lê todas as sugestões.
      </p>

      {sent ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
          Obrigado! Sua sugestão foi registrada.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              setError(null)
            }}
            rows={4}
            placeholder="Ex.: gostaria de receber um aviso quando um pedido meu for aprovado."
            className={FIELD}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{message.trim().length}/2000</span>
            <Button
              onClick={() =>
                startTransition(async () => {
                  const result = await submitSuggestionAction(message)
                  if (result.ok) {
                    setSent(true)
                    setMessage('')
                  } else {
                    setError(result.error)
                  }
                })
              }
              disabled={isPending || message.trim().length < 10}
              className="py-2 text-xs"
            >
              {isPending ? 'Enviando...' : 'Enviar sugestão'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </Card>
  )
}
