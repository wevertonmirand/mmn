import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getBranding } from '@/lib/branding'

/** Título e descrição vêm do nome cadastrado no admin, então renomear a
 *  marca também troca a aba do navegador e o texto de compartilhamento. */
export async function generateMetadata(): Promise<Metadata> {
  const { brand_name, brand_tagline } = await getBranding()

  return {
    title: { default: brand_name, template: `%s · ${brand_name}` },
    description: brand_tagline ?? 'Acompanhe pontos, rede e prêmios em um só lugar.',
    applicationName: brand_name,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: brand_name },
  }
}

export const viewport: Viewport = {
  themeColor: '#D4AF37',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getBranding()

  return (
    <html lang="pt-BR" data-theme={theme}>
      <body className="min-h-dvh bg-slate-50">{children}</body>
    </html>
  )
}
