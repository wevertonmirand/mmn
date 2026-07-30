import { createClient } from '@/lib/supabase/server'

export type Branding = {
  brand_name: string
  brand_tagline: string | null
  logo_url: string | null
  logo_icon_url: string | null
  theme: string
  gamification_enabled: boolean
}

/** Usado quando o banco ainda não foi aplicado ou está fora do ar —
 *  a marca nunca deve sumir da tela por causa disso. */
export const DEFAULT_BRANDING: Branding = {
  brand_name: 'Shopurbanus MCI',
  brand_tagline: null,
  logo_url: null,
  logo_icon_url: null,
  theme: 'gold',
  gamification_enabled: true,
}

/**
 * Lê a marca da view pública, que o visitante anônimo da loja também
 * alcança (`settings` inteira é restrita a autenticados).
 */
export async function getBranding(): Promise<Branding> {
  // `createClient()` fica FORA do try: ele chama `cookies()`, que lança o
  // sinal interno de renderização dinâmica do Next. Capturar esse sinal faz
  // o Next tentar prerenderizar a rota e o build falha.
  const supabase = await createClient()

  try {
    const { data } = await supabase
      .from('v_public_branding')
      .select('*')
      .maybeSingle()

    if (!data) return DEFAULT_BRANDING

    return {
      ...DEFAULT_BRANDING,
      ...data,
      brand_name: data.brand_name?.trim() || DEFAULT_BRANDING.brand_name,
    }
  } catch {
    // Banco ainda não migrado (a view não existe) ou fora do ar:
    // a marca cai no padrão em vez de derrubar a página.
    return DEFAULT_BRANDING
  }
}
