import { createClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { SubmitForm } from '@/components/commerce/SubmitForm'
import { placeInternalOrderAction } from '@/lib/actions/internal-commerce'
import { formatBRL, formatPoints } from '@/lib/utils'
import type { Product } from '@/lib/types'

export default async function ComprarPage() {
 const supabase=await createClient(); const {data}=await supabase.from('products').select('*').eq('is_active',true).order('sort_order')
 return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Loja interna</h1><p className="text-sm text-gray-500">Estoque e pontos são creditados somente após a aprovação do pagamento.</p></div><div className="grid gap-3 sm:grid-cols-2">{((data??[]) as Product[]).map(p=><Card key={p.id}><CardTitle>{p.name}</CardTitle><p className="my-2 text-sm text-gray-500">{p.description}</p><p className="font-bold">{formatBRL(p.price_cents)} · {formatPoints(p.points_value)} pts</p><SubmitForm action={placeInternalOrderAction} label="Fazer pedido"><input type="hidden" name="product_id" value={p.id}/><input className="mt-3 w-24 rounded-xl border p-2" name="quantity" type="number" min="1" defaultValue="1" /></SubmitForm></Card>)}</div></div>
}
