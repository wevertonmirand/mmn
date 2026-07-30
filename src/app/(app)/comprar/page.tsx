import { createClient } from '@/lib/supabase/server'
import { InternalStore } from '@/components/commerce/InternalStore'
import type { Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ComprarPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loja interna</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monte seu pedido de estoque. Tudo é creditado após a confirmação do pagamento.
        </p>
      </div>

      <InternalStore products={(data ?? []) as Product[]} />
    </div>
  )
}
