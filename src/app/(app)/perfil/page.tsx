import { redirect } from 'next/navigation'
import { LogOut, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LogoutButton } from '@/components/auth/LogoutButton'
import {
  PasswordPanel,
  ReferralLinkPanel,
  SuggestionPanel,
} from '@/components/perfil/ProfilePanels'
import { formatDateTime, formatPoints } from '@/lib/utils'
import type { Sale, UserRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: sales }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('sales')
      .select('*')
      .eq('user_id', user.id)
      .order('sold_at', { ascending: false })
      .limit(30),
  ])

  if (!profile) redirect('/login')
  const me = profile as UserRow & { username_changed_at: string | null }
  const history = (sales ?? []) as Sale[]
  const active = history.filter((s) => s.status === 'ativa')

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{me.full_name}</CardTitle>
            <p className="mt-0.5 truncate text-sm text-gray-500">{me.email}</p>
            {me.phone && <p className="text-sm text-gray-500">WhatsApp: {me.phone}</p>}
          </div>
          <Badge tone="gold">{formatPoints(me.lifetime_points)} pts</Badge>
        </div>

        {me.is_admin && (
          <Link
            href="/admin"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-gold-200 bg-gradient-gold-soft px-4 py-2.5 text-sm font-semibold text-gold-800 transition-transform hover:scale-105"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Painel do administrador
          </Link>
        )}
      </Card>

      <ReferralLinkPanel username={me.username} locked={me.username_changed_at !== null} />

      <PasswordPanel email={me.email ?? ''} />

      <Card>
        <CardTitle>Histórico de vendas</CardTitle>
        <p className="mt-1 text-sm text-gray-500">
          {active.length} venda{active.length === 1 ? '' : 's'} ativa
          {active.length === 1 ? '' : 's'} de {history.length} registrada
          {history.length === 1 ? '' : 's'}.
        </p>

        {history.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            Nenhuma venda ainda. Compartilhe seu link ou registre uma venda em{' '}
            <Link href="/vendas" className="font-semibold accent-text">
              Vendas
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {history.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {sale.quantity}× {sale.product_name}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(sale.sold_at)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold accent-text">
                    {formatPoints(sale.base_points * sale.quantity)} pts
                  </p>
                  {sale.status !== 'ativa' && (
                    <Badge tone="slate">
                      {sale.status === 'cancelada' ? 'Cancelada' : 'Em análise'}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SuggestionPanel />

      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-gray-400" aria-hidden />
            Sessão
          </span>
        </CardTitle>
        <div className="mt-3">
          <LogoutButton />
        </div>
      </Card>
    </div>
  )
}
