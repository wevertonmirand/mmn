import { Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NetworkDrilldown } from '@/components/rede/NetworkDrilldown'
import { loadMyNetworkAction } from '@/lib/actions/network'
import { Card } from '@/components/ui/Card'
import type { NetworkNode } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RedePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // get_my_network_children resolve no servidor em que nível o chamador
  // está olhando e redige os campos: fora do nível 1 só o nome atravessa.
  // Crossline e níveis além do 5º voltam vazios.
  const { data, error } = await supabase.rpc('get_my_network_children', { p_parent: null })
  const roots = (data ?? []) as NetworkNode[]

  const directs = roots[0]?.total_children ?? roots.length
  const reach = roots.reduce((sum, node) => sum + (node.network_count ?? 0), 0)
  const total = directs + reach

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha rede</h1>
        <p className="mt-1 text-sm text-gray-500">
          {directs} indicado{directs === 1 ? '' : 's'} direto{directs === 1 ? '' : 's'} · {total}{' '}
          pessoa{total === 1 ? '' : 's'} até o 5º nível
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-gray-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        <span>
          Toque no nome para abrir o próximo nível — você acompanha até o 5º. Do 2º ao 5º nível
          aparece só o nome; o contato direto fica com quem você indicou pessoalmente.
        </span>
      </p>

      {error ? (
        <Card>
          <p className="text-sm text-red-600">Não foi possível carregar sua rede.</p>
        </Card>
      ) : (
        <NetworkDrilldown
          roots={roots}
          load={loadMyNetworkAction}
          mode="affiliate"
          viewerName={
            typeof user?.user_metadata?.full_name === 'string'
              ? user.user_metadata.full_name
              : undefined
          }
        />
      )}
    </div>
  )
}
