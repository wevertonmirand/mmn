import Link from 'next/link'
import { CustomerSignupForm } from '@/components/auth/CustomerSignupForm'

export default function CadastroClientePage({
  searchParams,
}: {
  searchParams: { ref?: string }
}) {
  const sponsor = searchParams.ref?.toLowerCase().replace(/[^a-z0-9._-]/g, '') || null

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="accent-gradient mx-auto mb-4 h-14 w-14 rounded-2xl" />
        <h1 className="text-2xl font-bold text-gray-900">Criar conta de cliente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Para acompanhar seus pedidos e receber o contato da equipe.
        </p>
      </div>

      <CustomerSignupForm sponsorUsername={sponsor} />

      <p className="mt-6 text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold accent-text">
          Entrar
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-gray-400">
        Quer ser afiliado?{' '}
        <Link href={sponsor ? `/cadastro?ref=${sponsor}` : '/cadastro'} className="underline">
          Cadastre-se como afiliado
        </Link>
      </p>
    </main>
  )
}
