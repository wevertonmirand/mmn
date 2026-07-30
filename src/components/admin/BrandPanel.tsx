'use client'

import { useState, useTransition } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { updateSettingsAction } from '@/lib/actions/admin'
import type { Settings } from '@/lib/types'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

/** Renomear a marca e trocar os logos. Vale para a loja, as telas de
 *  entrada, o título da aba e o nome do app instalado (PWA). */
export function BrandPanel({ settings }: { settings: Settings }) {
  const [name, setName] = useState(settings.brand_name)
  const [tagline, setTagline] = useState(settings.brand_tagline ?? '')
  const [logo, setLogo] = useState(settings.logo_url ?? '')
  const [icon, setIcon] = useState(settings.logo_icon_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const save = () => {
    if (!name.trim()) {
      setError('O nome da marca não pode ficar em branco.')
      return
    }

    startTransition(async () => {
      const result = await updateSettingsAction({
        brand_name: name.trim(),
        brand_tagline: tagline.trim() || null,
        logo_url: logo.trim() || null,
        logo_icon_url: icon.trim() || null,
      })

      if (result.ok) {
        setError(null)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 2500)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Card>
      <CardTitle>Identidade da marca</CardTitle>
      <p className="mt-2 text-sm text-gray-500">
        Vale para a loja, as telas de login e cadastro, o título da aba do navegador e o nome do app
        quando instalado no celular.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Nome da marca</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Shopurbanus MCI"
            className={FIELD}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Frase de apoio (opcional)
          </span>
          <input
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="Ex.: Produtos e oportunidade para toda a família"
            className={FIELD}
          />
        </label>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-gray-900">Logos</p>
          <p className="mt-1 text-xs text-gray-500">
            Suba os arquivos no <strong>Storage</strong> do Supabase (bucket público, ex.{' '}
            <code className="rounded bg-white px-1">branding</code>), copie a URL pública e cole
            abaixo. PNG com fundo transparente fica melhor. As imagens são exibidas com{' '}
            <code className="rounded bg-white px-1">object-contain</code>: nunca cortamos nem
            esticamos o logo.
          </p>

          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Logo principal (horizontal)
              </span>
              <input
                value={logo}
                onChange={(event) => setLogo(event.target.value)}
                placeholder="https://SEU-PROJETO.supabase.co/storage/v1/object/public/branding/logo.png"
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Ícone quadrado (app instalado)
              </span>
              <input
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="https://SEU-PROJETO.supabase.co/storage/v1/object/public/branding/icone-512.png"
                className={FIELD}
              />
            </label>
          </div>

          {/* pré-visualização com o mesmo tratamento das telas reais */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-xs font-medium text-gray-500">Prévia:</span>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt="Prévia do logo principal"
                className="h-12 w-32 object-contain"
              />
            ) : (
              <span className="accent-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-white">
                {(name.trim() || 'S').charAt(0).toUpperCase()}
              </span>
            )}
            {icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={icon}
                alt="Prévia do ícone quadrado"
                className="h-12 w-12 rounded-xl object-contain"
              />
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Sem logo cadastrado, usamos a inicial do nome sobre o gradiente da paleta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button disabled={isPending} onClick={save} className="py-3 text-xs">
            {isPending ? 'Salvando...' : 'Salvar identidade'}
          </Button>
          {saved && <span className="text-sm font-medium text-emerald-600">Salvo!</span>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Card>
  )
}
