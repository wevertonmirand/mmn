import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPoints } from '@/lib/utils'
import type { DownlineNode } from '@/lib/types'

/**
 * Renderiza apenas a downline devolvida pelo banco. O RLS já garante que
 * crosslines nunca chegam até aqui — não há filtro de segurança no cliente.
 */
export function NetworkTree({ nodes }: { nodes: DownlineNode[] }) {
  if (nodes.length === 0) {
    return (
      <Card>
        <CardTitle>Minha rede</CardTitle>
        <p className="mt-3 text-sm text-gray-500">
          Sua rede está vazia. Compartilhe seu link de indicação para começar.
        </p>
      </Card>
    )
  }

  const byLevel = nodes.reduce<Map<number, DownlineNode[]>>((acc, node) => {
    const bucket = acc.get(node.depth) ?? []
    bucket.push(node)
    acc.set(node.depth, bucket)
    return acc
  }, new Map())

  const levels = [...byLevel.keys()].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {levels.map((level) => {
        const members = byLevel.get(level)!
        return (
          <Card key={level}>
            <div className="flex items-center justify-between">
              <CardTitle>Nível {level}</CardTitle>
              <Badge tone="slate">{members.length}</Badge>
            </div>

            <ul className="mt-3 divide-y divide-slate-100">
              {members.map((node) => (
                <li key={node.user_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{node.full_name}</p>
                    <p className="text-xs text-gray-500">
                      @{node.username} · desde {formatDate(node.joined_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold accent-text">
                      {formatPoints(node.lifetime_points)}
                    </p>
                    {node.is_inactive ? (
                      <Badge tone="red" className="mt-1">
                        Inativo
                      </Badge>
                    ) : (
                      node.rank_name && (
                        <p className="mt-1 text-xs text-gray-400">{node.rank_name}</p>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
