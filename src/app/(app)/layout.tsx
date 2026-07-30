import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Home, ImageIcon, Network, Receipt, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/dashboard', label: 'Início', Icon: Home },
  { href: '/vendas', label: 'Vendas', Icon: ShoppingBag },
  { href: '/pedidos', label: 'Pedidos', Icon: Receipt },
  { href: '/rede', label: 'Rede', Icon: Network },
  { href: '/materiais', label: 'Materiais', Icon: ImageIcon },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-28 pt-6">{children}</main>

      <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="flex items-stretch justify-around py-2">
          {NAV.map(({ href, label, Icon }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gold-600"
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
