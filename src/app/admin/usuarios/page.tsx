import { createClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CloseMonthButton } from '@/components/admin/CloseMonthButton'
import { formatPoints } from '@/lib/utils'
import type { AtRiskUser } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('v_users_at_risk').select('*')
  const users = (data ?? []) as AtRiskUser[]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Afiliados com 2 meses sem ativação (contato preventivo) e já inativos.
        </p>
        <CloseMonthButton />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Alertas de inatividade</CardTitle>
          <Badge tone="slate">{users.length}</Badge>
        </div>

        {users.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nenhum afiliado em risco no momento.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-4 font-semibold">Afiliado</th>
                  <th className="pb-2 pr-4 font-semibold">Patrocinador</th>
                  <th className="pb-2 pr-4 font-semibold">Contato</th>
                  <th className="pb-2 pr-4 font-semibold">Mês atual</th>
                  <th className="pb-2 pr-4 font-semibold">Pontos</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {user.sponsor_username ? `@${user.sponsor_username}` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {user.phone ?? user.email ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {user.products_this_month}/{user.min_required}
                    </td>
                    <td className="py-3 pr-4 font-medium accent-text">
                      {formatPoints(user.lifetime_points)}
                    </td>
                    <td className="py-3">
                      {user.is_inactive ? (
                        <Badge tone="red">Inativo</Badge>
                      ) : (
                        <Badge tone="amber">{user.inactive_streak}º mês sem ativação</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
