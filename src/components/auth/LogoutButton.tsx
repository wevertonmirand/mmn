'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      disabled={isPending}
      className="w-full py-2 text-xs"
      onClick={() =>
        startTransition(async () => {
          await createClient().auth.signOut()
          router.replace('/login')
          router.refresh()
        })
      }
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {isPending ? 'Saindo...' : 'Sair da conta'}
    </Button>
  )
}
