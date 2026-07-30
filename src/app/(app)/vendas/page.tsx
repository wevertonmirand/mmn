import { createClient } from '@/lib/supabase/server'
import { SaleForm } from '@/components/vendas/SaleForm'
import { SalesList } from '@/components/vendas/SalesList'
import type { Sale } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function VendasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('user_id', user!.id)
    .order('sold_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
      <SaleForm />
      <SalesList sales={(sales ?? []) as Sale[]} />
    </div>
  )
}
