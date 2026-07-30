/**
 * Credenciais públicas do Supabase.
 *
 * O Supabase renomeou as chaves de API: `sb_publishable_...` substitui a
 * antiga anon key (e `sb_secret_...` substitui a service_role). As duas
 * cumprem o mesmo papel no client — são seguras no browser porque o RLS
 * é que decide o acesso — então aceitamos qualquer um dos nomes.
 *
 * NUNCA use aqui uma chave `sb_secret_...` ou a service_role: elas
 * ignoram o RLS por completo e vazariam no bundle do browser.
 */

// Precisam ser lidas como literais para o Next.js substituir no build do
// client; `process.env[nome]` dinâmico não é inlinado.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * O supabase-js monta os caminhos (`/auth/v1/...`, `/rest/v1/...`) em cima
 * desta URL, então ela precisa ser só a origem. Colar a URL da API REST
 * (`https://projeto.supabase.co/rest/v1`) gera `/rest/v1/auth/v1/signup` e
 * todo login e cadastro devolve 404 — por isso normalizamos aqui em vez de
 * confiar no que veio no .env.
 */
export function supabaseUrl() {
  if (!URL) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL não definida. Copie .env.example para .env.local e preencha com os dados do seu projeto (Supabase > Settings > API).',
    )
  }

  const raw = URL.trim()

  let parsed: globalThis.URL
  try {
    parsed = new globalThis.URL(raw)
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL inválida: "${raw}". Use a Project URL completa, como https://seu-projeto.supabase.co`,
    )
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL inválida: "${raw}". Deve começar com https://`,
    )
  }

  return parsed.origin
}

export function supabaseKey() {
  const key = PUBLISHABLE_KEY ?? ANON_KEY

  if (!key) {
    throw new Error(
      'Chave pública do Supabase não definida. Informe NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...) ou NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local.',
    )
  }

  if (key.startsWith('sb_secret_')) {
    throw new Error(
      'Chave secreta detectada (sb_secret_...). Ela ignora o RLS e não pode ir para o browser — use a chave publishable.',
    )
  }

  return key
}
