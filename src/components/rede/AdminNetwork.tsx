'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, MessageCircle, Search } from 'lucide-react'
import { NetworkDrilldown } from '@/components/rede/NetworkDrilldown'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import {
  loadAdminNetworkAction,
  searchNetworkAction,
  type NetworkSearchHit,
} from '@/lib/actions/network'
import { removeAffiliateAction } from '@/lib/actions/internal-commerce'
import { whatsappLink } from '@/lib/utils'
import type { NetworkNode } from '@/lib/types'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

/**
 * Árvore completa do admin: navega por clique, sem limite de nível.
 *
 * A busca roda no banco (`search_network`), então acha gente em qualquer
 * profundidade e devolve o caminho desde a raiz — filtrar no cliente só
 * alcançaria o que já estivesse carregado.
 */
export function AdminNetwork({ roots }: { roots: NetworkNode[] }) {
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<NetworkSearchHit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [target, setTarget] = useState<NetworkNode | null>(null)

  const runSearch = () => {
    const clean = term.trim()
    setError(null)

    if (clean.length < 2) {
      setHits(null)
      return
    }

    startTransition(async () => {
      const result = await searchNetworkAction(clean)
      if (result.ok) setHits(result.hits)
      else setError(result.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Buscar por nome, usuário ou WhatsApp</span>
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value)
              if (event.target.value.trim().length < 2) setHits(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch()
            }}
            placeholder="Buscar por nome, usuário ou WhatsApp"
            className={FIELD}
          />
        </label>
        <Button onClick={runSearch} disabled={isPending} className="shrink-0 px-4 py-3 text-xs">
          <Search className="h-4 w-4" aria-hidden />
          {isPending ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {hits !== null ? (
        <SearchResults hits={hits} term={term} onClear={() => { setTerm(''); setHits(null) }} />
      ) : (
        <NetworkDrilldown
          roots={roots}
          load={loadAdminNetworkAction}
          mode="admin"
          viewerName="a administração"
          onRemove={setTarget}
        />
      )}

      {target && <RemoveDialog node={target} onClose={() => setTarget(null)} />}
    </div>
  )
}

function SearchResults({
  hits,
  term,
  onClear,
}: {
  hits: NetworkSearchHit[]
  term: string
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {hits.length} resultado{hits.length === 1 ? '' : 's'} para “{term}”
        </p>
        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={onClear}>
          Voltar à árvore
        </Button>
      </div>

      {hits.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-gray-500">
          Ninguém encontrado com esse nome, usuário ou WhatsApp.
        </p>
      ) : (
        <ul className="space-y-2">
          {hits.map((hit) => (
            <li key={hit.user_id} className="rounded-2xl border border-slate-100 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-gray-900">{hit.full_name}</p>
                {hit.username && <span className="text-xs text-gray-500">@{hit.username}</span>}
                <Badge tone={hit.is_inactive ? 'red' : 'green'}>
                  {hit.is_inactive ? 'Inativo' : 'Ativo'}
                </Badge>
              </div>

              {/* o caminho mostra de quem essa pessoa veio, nível a nível */}
              <p className="mt-1 text-xs text-gray-500">
                Nível {hit.path_names.length - 1} · {hit.path_names.join(' › ')}
              </p>

              {hit.phone && (
                <a
                  href={whatsappLink(hit.phone, `Olá, ${hit.full_name}!`)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-transform hover:scale-105"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  WhatsApp
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RemoveDialog({ node, onClose }: { node: NetworkNode; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    const data = new FormData()
    data.set('user_id', node.user_id)
    data.set('reason', reason.trim())

    startTransition(async () => {
      const result = await removeAffiliateAction(data)
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <Card className="w-full max-w-md">
        <CardTitle>
          <span className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Remover {node.full_name}
          </span>
        </CardTitle>

        <p className="mt-2 text-sm text-gray-600">
          A conta não é apagada: ela é marcada como <strong>inativa</strong> e quem estava abaixo
          dela passa a ficar sob o patrocinador de cima. O histórico de pontos e vendas permanece.
        </p>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Motivo (obrigatório)</span>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
            rows={3}
            placeholder="Ex.: solicitou o encerramento da conta."
            className={FIELD}
          />
        </label>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 py-2 text-xs"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1 py-2 text-xs"
            onClick={submit}
            disabled={isPending || reason.trim().length < 3}
          >
            {isPending ? 'Removendo...' : 'Confirmar remoção'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
