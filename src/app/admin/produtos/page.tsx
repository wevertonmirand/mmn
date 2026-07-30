import { createClient } from '@/lib/supabase/server'
import { ProductCrud } from '@/components/admin/ProductCrud'
import type { Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })

  return <ProductCrud products={(data ?? []) as Product[]} />
}
