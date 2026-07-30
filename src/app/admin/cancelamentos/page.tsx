import { createClient } from '@/lib/supabase/server'
import { CancellationQueue } from '@/components/admin/CancellationQueue'
import type { PendingCancellation } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function CancelamentosPage() {
  const supabase = createClient()
  const { data } = await supabase.from('v_pending_cancellations').select('*')

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Aprovar subtrai os pontos de toda a linha ascendente que recebeu crédito pela venda. Recusar
        devolve a venda ao status ativo.
      </p>
      <CancellationQueue items={(data ?? []) as PendingCancellation[]} />
    </div>
  )
}
