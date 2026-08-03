'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProductGallery } from '@/components/ui/ProductGallery'
import { placeInternalCartAction } from '@/lib/actions/internal-commerce'
import { formatBRL, formatPoints } from '@/lib/utils'
import type { CartLine, Product } from '@/lib/types'

/** Loja interna do afiliado: navega, monta o carrinho e envia um pedido só. */
export function InternalStore({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totals = useMemo(
    () => ({
      cents: cart.reduce((s, l) => s + l.price_cents * l.quantity, 0),
      points: cart.reduce((s, l) => s + l.points_value * l.quantity, 0),
      units: cart.reduce((s, l) => s + l.quantity, 0),
    }),
    [cart],
  )

  const change = (product: Product, delta: number) => {
    setCart((current) => {
      const line = current.find((l) => l.product_id === product.id)
      if (!line) {
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
      const quantity = line.quantity + delta
      if (quantity <= 0) return current.filter((l) => l.product_id !== product.id)
      return current.map((l) => (l.product_id === product.id ? { ...l, quantity } : l))
    })
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await placeInternalCartAction(
        cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      )
      if (result.ok) {
        setCart([])
        setOpen(false)
        setDone(true)
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <Card className="text-center">
        <span className="accent-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white">
          <Check className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Pedido enviado</h2>
        <p className="mt-2 text-sm text-gray-600">
          O estoque e os pontos entram na sua conta assim que o administrador confirmar o pagamento.
        </p>
        <Button onClick={() => setDone(false)} className="mt-5 w-full">
          Fazer outro pedido
        </Button>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {products.length === 0 && (
          <Card>
            <p className="text-sm text-gray-500">Nenhum produto disponível no momento.</p>
          </Card>
        )}

        {products.map((product) => {
          const line = cart.find((l) => l.product_id === product.id)
          return (
            <Card key={product.id}>
              <ProductGallery images={product.images ?? []} alt={product.name} />

              <h2 className="mt-3 font-semibold text-gray-900">{product.name}</h2>
              {product.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{product.description}</p>
              )}

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold accent-text">
                  {formatBRL(product.price_cents)}
                </span>
                <Badge tone="gold">{formatPoints(product.points_value)} pts</Badge>
              </div>

              <div className="mt-3">
                {line ? (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-1">
                    <button
                      type="button"
                      onClick={() => change(product, -1)}
                      aria-label={`Remover uma unidade de ${product.name}`}
                      className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-slate-100"
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="text-sm font-semibold">{line.quantity} no carrinho</span>
                    <button
                      type="button"
                      onClick={() => change(product, 1)}
                      aria-label={`Adicionar uma unidade de ${product.name}`}
                      className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-slate-100"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => change(product, 1)} className="w-full py-2 text-xs">
                    <Plus className="h-4 w-4" aria-hidden />
                    Adicionar ao carrinho
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {totals.units > 0 && !open && (
        <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Button onClick={() => setOpen(true)} className="w-full">
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {totals.units} {totals.units === 1 ? 'item' : 'itens'} · {formatBRL(totals.cents)}
          </Button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
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
                      onClick={() => setCart((c) => c.filter((l) => l.product_id !== line.product_id))}
                      aria-label={`Remover ${line.name}`}
                      className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-gray-600">Total</span>
                <span className="text-xl font-bold text-gray-900">{formatBRL(totals.cents)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm text-gray-500">
                <span>Pontos ao aprovar</span>
                <span>{formatPoints(totals.points)} pts</span>
              </div>
            </div>

            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-gray-600">
              Estoque, pontos e comissões da sua rede só entram depois que o administrador
              confirmar o pagamento.
            </p>

            <Button onClick={submit} disabled={isPending} className="mt-4 w-full">
              {isPending ? 'Enviando...' : 'Enviar pedido'}
            </Button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  )
}
