import { createClient } from '@/lib/supabase/server'
import { CommissionForm } from '@/components/admin/CommissionForm'
import type { Settings } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminComissoesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('*').eq('id', true).single()
  const settings = data as Settings

  return (
    <CommissionForm
      initial={[
        Number(settings.commission_level_1),
        Number(settings.commission_level_2),
        Number(settings.commission_level_3),
        Number(settings.commission_level_4),
        Number(settings.commission_level_5),
      ]}
    />
  )
}
