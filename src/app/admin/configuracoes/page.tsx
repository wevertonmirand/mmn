import { createClient } from '@/lib/supabase/server'
import { SettingsPanel } from '@/components/admin/SettingsPanel'
import type { Settings } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('*').eq('id', true).single()

  return <SettingsPanel settings={data as Settings} />
}
