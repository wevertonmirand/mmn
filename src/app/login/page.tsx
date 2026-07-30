import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="accent-gradient mx-auto mb-4 h-14 w-14 rounded-2xl" />
        <h1 className="text-2xl font-bold text-gray-900">Painel do Afiliado</h1>
        <p className="mt-1 text-sm text-gray-500">Entre para acompanhar sua rede e seus pontos.</p>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        Não tem conta?{' '}
        <Link href="/cadastro" className="font-semibold accent-text">
          Cadastre-se
        </Link>
      </p>
    </main>
  )
}
