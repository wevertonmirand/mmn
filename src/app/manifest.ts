import type { MetadataRoute } from 'next'
import { getBranding } from '@/lib/branding'

/**
 * Manifest gerado a partir da marca cadastrada, para que renomear no admin
 * também mude o nome do app instalado (PWA).
 *
 * `icons` só é preenchido quando existe um logo quadrado cadastrado:
 * apontar para arquivo inexistente faz a instalação do PWA falhar.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brand_name, brand_tagline, logo_icon_url } = await getBranding()

  return {
    name: brand_name,
    short_name: brand_name.split(' ')[0],
    description: brand_tagline ?? `Loja e painel de afiliados ${brand_name}.`,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#D4AF37',
    icons: logo_icon_url
      ? [{ src: logo_icon_url, sizes: '512x512', purpose: 'maskable' }]
      : [],
  }
}
