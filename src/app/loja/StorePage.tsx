import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StoreClient } from '@/components/loja/StoreClient'
import type { Customer, Product } from '@/lib/types'

/** Vitrine compartilhada por /loja e /loja/[ref]. */
export async function StorePage({ ref }: { ref: string | null }) {
  const supabase = await createClient()

  const [{ data: products }, { data: { user } }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase.auth.getUser(),
  ])

  // Só quem tem linha em `customers` pode fechar pedido. Um afiliado
  // logado navegando na loja cai no caminho de "criar conta de cliente".
  let customer: Customer | null = null
  if (user) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    customer = data ?? null
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loja</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monte seu pedido e nossa equipe entra em contato para fechar.
          </p>
        </div>
        {customer && (
          <Link href="/cliente/pedidos" className="shrink-0 text-sm font-semibold accent-text">
            Meus pedidos
          </Link>
        )}
      </header>

      <StoreClient
        products={(products ?? []) as Product[]}
        customer={customer}
        ref={ref}
      />
    </main>
  )
}
