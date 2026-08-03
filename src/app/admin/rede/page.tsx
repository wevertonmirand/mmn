import { Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AdminNetwork } from '@/components/rede/AdminNetwork'
import { Card } from '@/components/ui/Card'
import type { NetworkNode } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminRedePage() {
  const supabase = await createClient()

  // p_parent null devolve as raízes: o admin e qualquer conta que tenha
  // ficado sem patrocinador (por remoção, por exemplo).
  const { data, error } = await supabase.rpc('get_admin_network_children', { p_parent: null })
  const roots = (data ?? []) as NetworkNode[]

  const { data: stats } = await supabase.rpc('get_admin_stats')
  const totalUsers = (stats as { total_users?: number } | null)?.total_users

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rede completa</h1>
        <p className="mt-1 text-sm text-gray-500">
          {typeof totalUsers === 'number'
            ? `${totalUsers} afiliado${totalUsers === 1 ? '' : 's'} cadastrado${totalUsers === 1 ? '' : 's'}`
            : 'Toda a estrutura, sem limite de profundidade'}
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-gray-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        <span>
          Toque no nome para abrir o próximo nível — aqui não há limite. A busca encontra qualquer
          pessoa, em qualquer profundidade, e mostra por qual caminho ela entrou.
        </span>
      </p>

      {error ? (
        <Card>
          <p className="text-sm text-red-600">Não foi possível carregar a rede: {error.message}</p>
        </Card>
      ) : (
        <AdminNetwork roots={roots} />
      )}
    </div>
  )
}
