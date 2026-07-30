import { redirect } from 'next/navigation'
import { Network, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GamificationCard } from '@/components/dashboard/GamificationCard'
import { ActivationAlert } from '@/components/dashboard/ActivationAlert'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { StoreLinkCard } from '@/components/dashboard/StoreLinkCard'
import { Card } from '@/components/ui/Card'
import { formatPoints } from '@/lib/utils'
import type { DashboardPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_my_dashboard')

  if (error || !data) redirect('/login')

  const payload = data as unknown as DashboardPayload
  const gamified = payload.settings.gamification_enabled

  return (
    <div className="space-y-4">
      <DashboardHeader user={payload.user} showRank={gamified} />

      {gamified && (
        <GamificationCard
          points={payload.user.lifetime_points}
          nextPrize={payload.next_prize}
          claimablePrize={payload.claimable_prize}
        />
      )}

      {!gamified && (
        <Card>
          <p className="text-sm font-medium text-gray-500">Seus pontos</p>
          <p className="mt-1 text-4xl font-extrabold text-gray-900">
            {formatPoints(payload.user.lifetime_points)}
          </p>
        </Card>
      )}

      <ActivationAlert
        activation={payload.activation}
        isInactive={payload.user.is_inactive}
        inactiveStreak={payload.user.inactive_streak}
      />

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold-soft accent-text">
            <Users className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xl font-bold text-gray-900">{payload.network.directs}</p>
            <p className="text-xs text-gray-500">Diretos</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold-soft accent-text">
            <Network className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xl font-bold text-gray-900">{payload.network.total}</p>
            <p className="text-xs text-gray-500">Rede total</p>
          </div>
        </Card>
      </div>

      <QuickActions username={payload.user.username} />

      <StoreLinkCard username={payload.user.username} />
    </div>
  )
}
