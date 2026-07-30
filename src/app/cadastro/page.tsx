import Link from 'next/link'
import { SignupForm } from '@/components/auth/SignupForm'
import { BrandMark } from '@/components/ui/BrandMark'
import { getBranding } from '@/lib/branding'

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const sponsor = ref?.toLowerCase().replace(/[^a-z0-9._-]/g, '') || null
  const { brand_name, logo_url } = await getBranding()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <BrandMark name={brand_name} logoUrl={logo_url} />
        <p className="mt-2 text-center text-sm text-gray-500">
          Crie sua conta de afiliado e comece a construir sua rede hoje.
        </p>
      </div>

      <SignupForm sponsorUsername={sponsor} />

      <p className="mt-6 text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold accent-text">
          Entrar
        </Link>
      </p>
    </main>
  )
}
