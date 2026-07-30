'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Store } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { storeLink } from '@/lib/utils'

/**
 * Link da loja: pedidos que entram por ele são atribuídos ao afiliado e,
 * quando o admin fecha a venda, geram pontos na rede dele.
 */
export function StoreLinkCard({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(storeLink(username))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Sua loja</CardTitle>
          <p className="mt-1 truncate text-sm text-gray-600">/loja/{username}</p>
          <p className="mt-1 text-xs text-gray-500">
            Pedidos feitos por este link contam pontos para você.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold-soft accent-text">
          <Store className="h-5 w-5" aria-hidden />
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <Button onClick={copy} className="flex-1 py-2 text-xs" aria-live="polite">
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copiar link da loja
            </>
          )}
        </Button>
        <Link href="/pedidos" className="flex-1">
          <Button variant="outline" className="w-full py-2 text-xs">
            Meus pedidos
          </Button>
        </Link>
      </div>
    </Card>
  )
}
