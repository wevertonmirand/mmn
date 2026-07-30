import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import type { DashboardPayload } from '@/lib/types'

interface DashboardHeaderProps {
  user: DashboardPayload['user']
  showRank: boolean
}

export function DashboardHeader({ user, showRank }: DashboardHeaderProps) {
  const firstName = user.full_name.split(' ')[0]
  const initials = user.full_name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="flex items-center gap-4">
      <div className="accent-gradient rounded-full p-[2px]">
        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white ring-2 ring-white">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.full_name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold accent-text">
              {initials}
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500">Olá,</p>
        <h1 className="truncate text-xl font-bold text-gray-900">{firstName}</h1>
      </div>

      {showRank && user.rank_name && <Badge>{user.rank_name}</Badge>}
    </header>
  )
}
