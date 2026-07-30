import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StoreClient } from '@/components/loja/StoreClient'
import { BrandMark } from '@/components/ui/BrandMark'
import { getBranding } from '@/lib/branding'
import type { Customer, Product } from '@/lib/types'

/** Vitrine compartilhada por /loja e /loja/[ref]. */
export async function StorePage({ sponsorUsername }: { sponsorUsername: string | null }) {
  const supabase = await createClient()

  const branding = await getBranding()

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
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <BrandMark name={branding.brand_name} logoUrl={branding.logo_url} layout="inline" />
          {customer && (
            <Link href="/cliente/pedidos" className="shrink-0 text-sm font-semibold accent-text">
              Meus pedidos
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Monte seu pedido e nossa equipe entra em contato para fechar.
        </p>
      </header>

      <StoreClient
        products={(products ?? []) as Product[]}
        customer={customer}
        sponsorUsername={sponsorUsername}
      />
    </main>
  )
}
