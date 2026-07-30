import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandMark } from '@/components/ui/BrandMark'
import { getBranding } from '@/lib/branding'

const NAV = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/cancelamentos', label: 'Cancelamentos' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/premios', label: 'Prêmios' },
  { href: '/admin/configuracoes', label: 'Configurações' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  // 404 em vez de redirect: não revela a existência da área administrativa.
  if (!profile?.is_admin) notFound()

  const { brand_name, logo_url } = await getBranding()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <BrandMark name={brand_name} logoUrl={logo_url} layout="inline" />
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-gray-600">
            Administração
          </span>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:scale-105 hover:border-gold-300"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  )
}
