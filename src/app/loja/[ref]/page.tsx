import { StorePage } from '../StorePage'

export const dynamic = 'force-dynamic'

/** /loja/[username] — pedidos feitos aqui são atribuídos ao afiliado. */
export default function LojaComIndicacaoPage({ params }: { params: { ref: string } }) {
  const ref = params.ref.toLowerCase().replace(/[^a-z0-9._-]/g, '') || null
  return <StorePage ref={ref} />
}
