import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types'
import { supabaseKey, supabaseUrl } from '@/lib/supabase/env'

/** Rotas que não exigem sessão. A vitrine é aberta: o afiliado
 *  compartilha /loja/usuario e o visitante precisa poder ver os produtos. */
const PUBLIC_ROUTES = ['/loja', '/login', '/cadastro', '/cliente/cadastro', '/auth']

/** Páginas de entrada — quem já está logado não deve vê-las. */
const AUTH_PAGES = ['/login', '/cadastro', '/cliente/cadastro']

const startsWithAny = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabaseKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && !startsWithAny(pathname, PUBLIC_ROUTES)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // `/` resolve o destino conforme o papel (afiliado, admin ou cliente):
  // descobrir isso aqui custaria uma consulta ao banco a cada requisição.
  if (user && startsWithAny(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // A autorização real do /admin é feita no layout do servidor contra o banco.
  return response
}
