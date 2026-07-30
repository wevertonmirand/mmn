import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'gold' | 'amber' | 'red' | 'green' | 'slate'

const TONES: Record<Tone, string> = {
  gold: 'accent-gradient text-white',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  red: 'bg-red-50 text-red-700 border border-red-200',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  slate: 'bg-slate-100 text-gray-600',
}

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  className?: string
}

export function Badge({ children, tone = 'gold', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
