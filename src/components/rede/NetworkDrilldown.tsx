'use client'

import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight, MessageCircle, PhoneOff, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatPoints, whatsappLink } from '@/lib/utils'
import type { NetworkNode } from '@/lib/types'
import type { NetworkNodesResult } from '@/lib/actions/network'

type Loader = (parentId: string | null, offset?: number) => Promise<NetworkNodesResult>

/** chave do mapa de listas: a raiz não tem pai */
const ROOT = '@root'

type Props = {
  roots: NetworkNode[]
  load: Loader
  mode: 'admin' | 'affiliate'
  /** nome de quem está olhando, usado na mensagem do WhatsApp */
  viewerName?: string
  onRemove?: (node: NetworkNode) => void
}

/**
 * Árvore da rede, um nível por clique.
 *
 * Não há filtro de privacidade aqui: o que não pode ser visto chega como
 * `null` do banco. Se algum campo aparece, é porque a RPC decidiu que
 * pode aparecer — a UI nunca é a fronteira.
 */
export function NetworkDrilldown({ roots, load, mode, viewerName, onRemove }: Props) {
  // listas já carregadas, por id do pai (ROOT para o topo).
  // Recolher um nó não descarta o que ele já trouxe.
  const [lists, setLists] = useState<Map<string, NetworkNode[]>>(new Map([[ROOT, roots]]))
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  const fetchInto = useCallback(
    async (key: string, parentId: string | null, append: boolean) => {
      setBusy((prev) => new Set(prev).add(key))
      const offset = append ? (lists.get(key)?.length ?? 0) : 0
      const result = await load(parentId, offset)

      setBusy((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })

      if (!result.ok) {
        setErrors((prev) => new Map(prev).set(key, result.error))
        return
      }

      setErrors((prev) => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      setLists((prev) => {
        const next = new Map(prev)
        next.set(key, append ? [...(prev.get(key) ?? []), ...result.nodes] : result.nodes)
        return next
      })
    },
    [lists, load],
  )

  const toggle = useCallback(
    async (node: NetworkNode) => {
      const isOpen = expanded.has(node.user_id)

      setExpanded((prev) => {
        const next = new Set(prev)
        if (isOpen) next.delete(node.user_id)
        else next.add(node.user_id)
        return next
      })

      // busca só na primeira abertura
      if (!isOpen && !lists.has(node.user_id)) {
        await fetchInto(node.user_id, node.user_id, false)
      }
    },
    [expanded, lists, fetchInto],
  )

  const shared = { lists, expanded, busy, errors, toggle, fetchInto, mode, viewerName, onRemove }
  const rootNodes = lists.get(ROOT) ?? []

  if (rootNodes.length === 0) {
    return (
      <p className="rounded-2xl bg-slate-50 p-4 text-sm text-gray-500">
        {mode === 'admin'
          ? 'Nenhum afiliado cadastrado ainda.'
          : 'Sua rede está vazia. Compartilhe seu link de indicação para começar.'}
      </p>
    )
  }

  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        {rootNodes.map((node) => (
          <NetworkBranch key={node.user_id} node={node} {...shared} />
        ))}
      </ul>
      <LoadMore
        loaded={rootNodes.length}
        total={rootNodes[0]?.total_children ?? rootNodes.length}
        pending={busy.has(ROOT)}
        onLoad={() => fetchInto(ROOT, null, true)}
      />
    </div>
  )
}

type Shared = {
  lists: Map<string, NetworkNode[]>
  expanded: Set<string>
  busy: Set<string>
  errors: Map<string, string>
  toggle: (node: NetworkNode) => void
  fetchInto: (key: string, parentId: string | null, append: boolean) => Promise<void>
  mode: 'admin' | 'affiliate'
  viewerName?: string
  onRemove?: (node: NetworkNode) => void
}

type BranchProps = Shared & { node: NetworkNode }

function NetworkBranch(props: BranchProps) {
  const { node, lists, expanded, busy, errors, toggle, fetchInto } = props
  const isOpen = expanded.has(node.user_id)
  const kids = lists.get(node.user_id)
  const error = errors.get(node.user_id)

  return (
    <li>
      <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3">
        {node.can_expand ? (
          <button
            type="button"
            onClick={() => toggle(node)}
            aria-expanded={isOpen}
            aria-label={
              isOpen ? `Recolher ${node.full_name}` : `Ver quem está abaixo de ${node.full_name}`
            }
            className="mt-0.5 shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-slate-100 hover:text-gray-700"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : (
          <span className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        )}

        <NodeSummary {...props} />
      </div>

      {/* o trilho à esquerda é o que faz a hierarquia se ler: sem ele os
          níveis viram uma lista plana com um recuo imperceptível */}
      {isOpen && (
        <div className="ml-5 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
          {busy.has(node.user_id) && !kids && <p className="text-xs text-gray-400">Carregando...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {kids?.length === 0 && <p className="text-xs text-gray-400">Nenhum indicado ainda.</p>}

          <ul className="space-y-1">
            {kids?.map((kid) => (
              <NetworkBranch key={kid.user_id} {...props} node={kid} />
            ))}
          </ul>

          {kids && kids.length > 0 && (
            <LoadMore
              loaded={kids.length}
              total={kids[0].total_children}
              pending={busy.has(node.user_id)}
              onLoad={() => fetchInto(node.user_id, node.user_id, true)}
            />
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Linha do nó. Os campos extras aparecem quando o banco os enviou — ou
 * seja, no nível 1 do afiliado e em toda a árvore do admin.
 */
function NodeSummary({ node, mode, viewerName, onRemove }: BranchProps) {
  // `full_name` é o único campo garantido; a presença dos demais define
  // o quanto esta linha pode mostrar
  const detailed = node.username !== null

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="truncate font-medium text-gray-900">{node.full_name}</p>
        {node.username && <span className="truncate text-xs text-gray-500">@{node.username}</span>}
        {node.is_inactive === true && <Badge tone="red">Inativo</Badge>}
        {node.is_inactive === false && <Badge tone="green">Ativo</Badge>}
      </div>

      {detailed ? (
        <>
          <p className="mt-1 text-xs text-gray-500">
            {node.lifetime_points !== null && (
              <span className="font-semibold accent-text">{formatPoints(node.lifetime_points)}</span>
            )}
            {node.direct_count !== null && (
              <> · {node.direct_count} direto{node.direct_count === 1 ? '' : 's'}</>
            )}
            {node.network_count !== null && <> · {node.network_count} na rede (5 níveis)</>}
            {node.joined_at && <> · desde {formatDate(node.joined_at)}</>}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {node.phone ? (
              <a
                href={whatsappLink(
                  node.phone,
                  `Olá, ${node.full_name}! Aqui é ${viewerName ?? 'da sua equipe'}.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-transform hover:scale-105"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                WhatsApp
              </a>
            ) : (
              // a coluna é anulável de propósito (contas criadas pelo painel
              // do Supabase), então nada de wa.me/55 quebrado
              <span className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-400">
                <PhoneOff className="h-3.5 w-3.5" aria-hidden />
                WhatsApp não informado
              </span>
            )}

            {mode === 'admin' && onRemove && (
              <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => onRemove(node)}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Remover
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="mt-0.5 text-xs text-gray-400">
          Contato disponível apenas para quem você indicou diretamente.
        </p>
      )}
    </div>
  )
}

function LoadMore({
  loaded,
  total,
  pending,
  onLoad,
}: {
  loaded: number
  total: number
  pending: boolean
  onLoad: () => void
}) {
  if (loaded >= total) return null

  return (
    <Button variant="outline" disabled={pending} className="w-full py-2 text-xs" onClick={onLoad}>
      {pending ? 'Carregando...' : `Carregar mais (${total - loaded} restantes)`}
    </Button>
  )
}
