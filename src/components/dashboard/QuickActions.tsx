'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ImageIcon, Network, ShoppingBag } from 'lucide-react'
import { referralLink } from '@/lib/utils'

interface QuickActionsProps {
  username: string
}

const TILE =
  'flex flex-col items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left ' +
  'shadow-sm transition-all duration-200 hover:scale-105 hover:border-gold-300 active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2'

const ICON_WRAP =
  'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold-soft accent-text'

export function QuickActions({ username }: QuickActionsProps) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink(username))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={copyLink} className={TILE} aria-live="polite">
        <span className={ICON_WRAP}>
          {copied ? <Check className="h-5 w-5 text-emerald-600" aria-hidden /> : <Copy className="h-5 w-5" aria-hidden />}
        </span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">
            {copied ? 'Link copiado!' : 'Copiar Link'}
          </span>
          <span className="block text-xs text-gray-500">/cadastro?ref={username}</span>
        </span>
      </button>

      <Link href="/vendas" className={TILE}>
        <span className={ICON_WRAP}>
          <ShoppingBag className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Registrar Venda</span>
          <span className="block text-xs text-gray-500">Lançar produto vendido</span>
        </span>
      </Link>

      <Link href="/rede" className={TILE}>
        <span className={ICON_WRAP}>
          <Network className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Minha Rede</span>
          <span className="block text-xs text-gray-500">Ver sua downline</span>
        </span>
      </Link>

      <Link href="/materiais" className={TILE}>
        <span className={ICON_WRAP}>
          <ImageIcon className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">Materiais</span>
          <span className="block text-xs text-gray-500">Banners e vídeos</span>
        </span>
      </Link>
    </div>
  )
}
