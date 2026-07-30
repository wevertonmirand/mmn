import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(value))
}

export function referralLink(username: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return `${base}/cadastro?ref=${username}`
}

/** Progresso em % entre o rank/prêmio anterior e o próximo alvo. */
export function progressPercent(current: number, target: number, floor = 0) {
  if (target <= floor) return 100
  const pct = ((current - floor) / (target - floor)) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}
