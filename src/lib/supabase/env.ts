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

export function supabaseUrl() {
  if (!URL) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL não definida. Copie .env.example para .env.local e preencha com os dados do seu projeto (Supabase > Settings > API).',
    )
  }
  return URL
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
