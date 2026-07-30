import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Exclui assets e metadados públicos do app. O manifest precisa ficar de
  // fora: o navegador o busca sem cookies, e passar pela proteção de sessão
  // faria a instalação do PWA receber um redirect para /login.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|materials|.*\\.(?:svg|png|jpg|jpeg|webp|gif|mp4|ico)$).*)',
  ],
}
