import { Suspense } from 'react'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { BrandMark } from '@/components/ui/BrandMark'
import { getBranding } from '@/lib/branding'

export default async function LoginPage() {
  const { brand_name, logo_url } = await getBranding()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <BrandMark name={brand_name} logoUrl={logo_url} />
        <p className="mt-2 text-center text-sm text-gray-500">
          Entre para acompanhar sua rede e seus pontos.
        </p>
      </div>

      {/* LoginForm usa useSearchParams (para o ?next=), que exige Suspense
          caso a rota seja prerenderizada. */}
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-white" />}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-gray-500">
        Não tem conta?{' '}
        <Link href="/cadastro" className="font-semibold accent-text">
          Cadastre-se
        </Link>
      </p>
    </main>
  )
}
