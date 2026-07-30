import { createClient } from '@/lib/supabase/server'
import { OrderQueue } from '@/components/admin/OrderQueue'
import type { AdminOrder } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('v_admin_orders').select('*')

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Pedidos feitos na loja. Fale com o cliente e use <strong>Fechar venda</strong> para gerar as
        vendas e distribuir os pontos na rede do afiliado que indicou. Cancelar um pedido já fechado
        estorna os pontos.
      </p>
      <OrderQueue orders={(data ?? []) as AdminOrder[]} />
    </div>
  )
}
