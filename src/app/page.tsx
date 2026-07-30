import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Ponto único de roteamento por papel: afiliado, admin ou cliente. */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/loja')

  // O RLS permite ler a própria linha; um cliente não tem linha em `users`.
  const { data: affiliate } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (affiliate?.is_admin) redirect('/admin')
  if (affiliate) redirect('/dashboard')

  redirect('/loja')
}
