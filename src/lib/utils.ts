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

export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(cents / 100)
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

/** Link para recrutar novos afiliados. */
export function referralLink(username: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return `${base}/cadastro?ref=${username}`
}

/** Link da loja do afiliado — pedidos por aqui são atribuídos a ele. */
export function storeLink(username: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return `${base}/loja/${username}`
}

/** Abre a conversa no WhatsApp para o admin fechar a venda. */
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}

/** Progresso em % entre o rank/prêmio anterior e o próximo alvo. */
export function progressPercent(current: number, target: number, floor = 0) {
  if (target <= floor) return 100
  const pct = ((current - floor) / (target - floor)) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}
