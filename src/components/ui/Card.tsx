import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <section className={cn('rounded-2xl border border-slate-100 bg-white p-5 shadow-sm', className)}>
      {children}
    </section>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn('text-sm font-semibold uppercase tracking-wide text-gray-500', className)}>
      {children}
    </h2>
  )
}
