import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'gold' | 'outline' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  shine?: boolean
}

const VARIANTS: Record<Variant, string> = {
  gold: 'accent-gradient text-white shadow-gold hover:scale-105',
  outline: 'border border-slate-200 bg-white text-gray-900 hover:border-gold-400 hover:scale-105',
  ghost: 'text-gray-600 hover:bg-slate-100',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
}

export function Button({ variant = 'gold', shine = false, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold',
        'transition-all duration-200 active:scale-95',
        'disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
        VARIANTS[variant],
        shine && 'btn-shine',
        className,
      )}
    />
  )
}
