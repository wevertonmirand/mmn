import { StorePage } from '../StorePage'

export const dynamic = 'force-dynamic'

/** /loja/[username] — pedidos feitos aqui são atribuídos ao afiliado. */
export default async function LojaComIndicacaoPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref: raw } = await params
  const sponsorUsername = raw.toLowerCase().replace(/[^a-z0-9._-]/g, '') || null
  return <StorePage sponsorUsername={sponsorUsername} />
}
