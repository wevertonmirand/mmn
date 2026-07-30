import type { Metadata, Viewport } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Painel do Afiliado',
  description: 'Acompanhe pontos, rede e prêmios em um só lugar.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Afiliados' },
}

export const viewport: Viewport = {
  themeColor: '#D4AF37',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('theme')
    .eq('id', true)
    .maybeSingle()

  return (
    <html lang="pt-BR" data-theme={settings?.theme ?? 'gold'}>
      <body className="min-h-dvh bg-slate-50">{children}</body>
    </html>
  )
}
