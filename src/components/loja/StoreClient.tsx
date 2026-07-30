'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProductGallery } from '@/components/ui/ProductGallery'
import { placeOrderAction } from '@/lib/actions/store'
import { cn, formatBRL } from '@/lib/utils'
import type { CartLine, Customer, PlacedOrder, Product } from '@/lib/types'

const CART_KEY = 'loja:cart'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

interface StoreClientProps {
  products: Product[]
  customer: Customer | null
  /** username do afiliado do link — atribui o pedido a ele.
   *  Não pode se chamar `ref`: é prop reservada do React. */
  sponsorUsername: string | null
}

export function StoreClient({ products, customer, sponsorUsername }: StoreClientProps) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [open, setOpen] = useState(false)
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // O carrinho sobrevive ao cadastro/login do cliente. A leitura precisa
  // acontecer depois da montagem: no servidor não existe localStorage, e ler
  // no inicializador do useState faria o HTML hidratado divergir do render
  // do servidor. O custo é um render extra na montagem.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_KEY)
      if (saved) setCart(JSON.parse(saved) as CartLine[])
    } catch {
      setCart([])
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // `hydrated` evita apagar o carrinho salvo com o [] do primeiro render.
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  const totals = useMemo(
    () => ({
      cents: cart.reduce((sum, line) => sum + line.price_cents * line.quantity, 0),
      units: cart.reduce((sum, line) => sum + line.quantity, 0),
    }),
    [cart],
  )

  const changeQuantity = (product: Product, delta: number) => {
    setCart((current) => {
      const existing = current.find((line) => line.product_id === product.id)
      if (!existing) {
        return delta > 0
          ? [...current, {
              product_id: product.id,
              name: product.name,
              price_cents: product.price_cents,
              points_value: product.points_value,
              quantity: 1,
            }]
          : current
      }
      const quantity = existing.quantity + delta
      if (quantity <= 0) return current.filter((line) => line.product_id !== product.id)
      return current.map((line) =>
        line.product_id === product.id ? { ...line, quantity } : line,
      )
    })
  }

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await placeOrderAction(
        cart,
        String(formData.get('phone') ?? ''),
        String(formData.get('address') ?? ''),
        String(formData.get('notes') ?? ''),
        sponsorUsername,
      )
      if (result.ok) {
        setPlaced(result.order)
        setCart([])
        setError(null)
      } else {
        setError(result.error)
      }
    })
  }

  if (placed) {
    return (
      <Card className="text-center">
        <span className="accent-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white">
          <Check className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          Pedido #{placed.order_number} recebido
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Registramos {placed.items} {placed.items === 1 ? 'item' : 'itens'} no valor de{' '}
          <strong>{formatBRL(placed.total_cents)}</strong>. Nossa equipe entrará em contato pelo
          telefone informado para combinar pagamento e entrega.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/cliente/pedidos">
            <Button className="w-full">Ver meus pedidos</Button>
          </Link>
          <Button variant="outline" onClick={() => setPlaced(null)} className="w-full">
            Continuar comprando
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {products.length === 0 && (
          <Card>
            <p className="text-sm text-gray-500">Nenhum produto disponível no momento.</p>
          </Card>
        )}

        {products.map((product) => {
          const line = cart.find((item) => item.product_id === product.id)
          return (
            <Card key={product.id} className="flex gap-4">
              <ProductGallery
                images={product.images ?? []}
                alt={product.name}
                className="w-24 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-gray-900">{product.name}</h2>
                {product.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{product.description}</p>
                )}
                <p className="mt-2 text-lg font-bold accent-text">
                  {formatBRL(product.price_cents)}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                {line ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-1">
                    <button
                      type="button"
                      onClick={() => changeQuantity(product, -1)}
                      aria-label={`Remover uma unidade de ${product.name}`}
                      className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-slate-100"
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(product, 1)}
                      aria-label={`Adicionar uma unidade de ${product.name}`}
                      className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-slate-100"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => changeQuantity(product, 1)} className="px-4 py-2 text-xs">
                    <Plus className="h-4 w-4" aria-hidden />
                    Adicionar
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* barra fixa do carrinho */}
      {totals.units > 0 && !open && (
        <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Button onClick={() => setOpen(true)} className="w-full">
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {totals.units} {totals.units === 1 ? 'item' : 'itens'} · {formatBRL(totals.cents)}
          </Button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Seu pedido</h2>
              <Button variant="ghost" onClick={() => setOpen(false)} className="px-2 py-1 text-xs">
                Fechar
              </Button>
            </div>

            <ul className="divide-y divide-slate-100">
              {cart.map((line) => (
                <li key={line.product_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{line.name}</p>
                    <p className="text-xs text-gray-500">
                      {line.quantity} × {formatBRL(line.price_cents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatBRL(line.price_cents * line.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((c) => c.filter((item) => item.product_id !== line.product_id))
                      }
                      aria-label={`Remover ${line.name}`}
                      className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatBRL(totals.cents)}</span>
            </div>

            <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs text-gray-600">
              O pagamento não é feito pelo site. Depois de enviar o pedido, nossa equipe entra em
              contato para combinar pagamento e entrega.
            </p>

            {customer ? (
              <form action={submit} className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Telefone / WhatsApp
                  </span>
                  <input
                    name="phone"
                    defaultValue={customer.phone ?? ''}
                    placeholder="(11) 99999-0000"
                    required
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Endereço de entrega
                  </span>
                  <input name="address" defaultValue={customer.address ?? ''} className={FIELD} />
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Observações (opcional)"
                  className={FIELD}
                />

                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? 'Enviando...' : 'Enviar pedido'}
                </Button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </form>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  Crie sua conta para enviar o pedido. Seu carrinho fica salvo.
                </p>
                <Link
                  href={
                    sponsorUsername ? `/cliente/cadastro?ref=${sponsorUsername}` : '/cliente/cadastro'
                  }
                  className="block"
                >
                  <Button className="w-full">Criar conta e pedir</Button>
                </Link>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Já tenho conta
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {sponsorUsername && (
        <p className={cn('mt-4 text-center text-xs text-gray-400', open && 'hidden')}>
          Indicado por <Badge tone="slate">@{sponsorUsername}</Badge>
        </p>
      )}
    </>
  )
}
