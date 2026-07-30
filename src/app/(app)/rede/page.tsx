import { createClient } from '@/lib/supabase/server'
import { NetworkTree } from '@/components/rede/NetworkTree'
import { Card } from '@/components/ui/Card'
import type { DownlineNode } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RedePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // get_full_downline valida no servidor que a raiz é o próprio usuário
  // ou alguém da sua downline. Crossline retorna vazio.
  const { data, error } = await supabase.rpc('get_full_downline', { p_root: user!.id })
  const nodes = (data ?? []) as DownlineNode[]
  const active = nodes.filter((node) => !node.is_inactive).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha rede</h1>
        <p className="mt-1 text-sm text-gray-500">
          {nodes.length} afiliado{nodes.length === 1 ? '' : 's'} · {active} ativo
          {active === 1 ? '' : 's'}
        </p>
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-red-600">Não foi possível carregar sua rede.</p>
        </Card>
      ) : (
        <NetworkTree nodes={nodes} />
      )}
    </div>
  )
}
