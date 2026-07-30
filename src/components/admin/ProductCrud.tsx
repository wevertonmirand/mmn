'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { upsertProductAction } from '@/lib/actions/store'
import { formatBRL, formatPoints } from '@/lib/utils'
import type { Product } from '@/lib/types'

const FIELD =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30'

export function ProductCrud({ products }: { products: Product[] }) {
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await upsertProductAction(formData)
      if (result.ok) {
        setEditing(null)
        setCreating(false)
        setError(null)
      } else {
        setError(result.error)
      }
    })
  }

  const showForm = creating || editing !== null

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Produtos da loja</CardTitle>
        {!showForm && (
          <Button
            variant="outline"
            onClick={() => {
              setCreating(true)
              setEditing(null)
            }}
            className="py-2 text-xs"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Novo produto
          </Button>
        )}
      </div>

      {showForm && (
        <form action={submit} className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
          <input type="hidden" name="id" value={editing?.id ?? ''} />
          <input
            name="name"
            defaultValue={editing?.name ?? ''}
            placeholder="Nome do produto"
            required
            className={FIELD}
          />
          <textarea
            name="description"
            defaultValue={editing?.description ?? ''}
            placeholder="Descrição"
            rows={2}
            className={FIELD}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Preço (R$)</span>
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={editing ? (editing.price_cents / 100).toFixed(2) : ''}
                required
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Pontos por unidade
              </span>
              <input
                name="points_value"
                type="number"
                min={0}
                step={1}
                defaultValue={editing?.points_value ?? 0}
                required
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">SKU</span>
              <input name="sku" defaultValue={editing?.sku ?? ''} className={FIELD} />
            </label>
          </div>

          <input
            name="image_url"
            defaultValue={editing?.image_url ?? ''}
            placeholder="URL da imagem (opcional)"
            className={FIELD}
          />
          <label className="block text-sm text-gray-600">Ou envie uma imagem
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={`${FIELD} mt-1 bg-white`} />
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editing?.is_active ?? true}
              className="h-4 w-4 rounded accent-gold-500"
            />
            Ativo (aparece na loja)
          </label>

          <p className="text-xs text-gray-500">
            Os pontos por unidade são o que a venda deste produto injeta na rede quando o admin
            fecha o pedido.
          </p>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="py-2 text-xs">
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreating(false)
                setEditing(null)
                setError(null)
              }}
              className="py-2 text-xs"
            >
              Cancelar
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Nenhum produto cadastrado. A loja aparece vazia para os clientes.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {formatBRL(product.price_cents)} · {formatPoints(product.points_value)} pts
                  {product.sku && ` · ${product.sku}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!product.is_active && <Badge tone="slate">Inativo</Badge>}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(product)
                    setCreating(false)
                  }}
                  className="p-2"
                  aria-label={`Editar ${product.name}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
