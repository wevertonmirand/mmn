import { createClient } from '@/lib/supabase/server'
import { PrizeQueue } from '@/components/admin/PrizeQueue'
import { PrizeCrud } from '@/components/admin/PrizeCrud'
import type { Prize, PrizeRequestRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PremiosPage() {
  const supabase = createClient()

  const [{ data: requests }, { data: prizes }] = await Promise.all([
    supabase.from('v_prize_requests').select('*'),
    supabase.from('prizes').select('*').order('required_points', { ascending: true }),
  ])

  return (
    <div className="space-y-4">
      <PrizeQueue requests={(requests ?? []) as PrizeRequestRow[]} />
      <PrizeCrud prizes={(prizes ?? []) as Prize[]} />
    </div>
  )
}
