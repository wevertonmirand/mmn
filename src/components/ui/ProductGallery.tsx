'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Galeria de até 3 fotos. `object-contain` em todas: cortar a foto de um
 * produto engana o cliente sobre o que ele está comprando.
 */
export function ProductGallery({
  images,
  alt,
  className,
}: {
  images: string[]
  alt: string
  className?: string
}) {
  const photos = images.filter(Boolean)
  const [active, setActive] = useState(0)

  if (photos.length === 0) {
    return (
      <div
        className={cn(
          'flex aspect-square w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-300',
          className,
        )}
      >
        <ImageOff className="h-8 w-8" aria-hidden />
        <span className="sr-only">Sem foto</span>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[Math.min(active, photos.length - 1)]}
        alt={alt}
        className="aspect-square w-full rounded-2xl bg-white object-contain"
      />

      {photos.length > 1 && (
        <div className="mt-2 flex gap-2">
          {photos.map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Foto ${index + 1} de ${alt}`}
              aria-current={index === active}
              className={cn(
                'h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-colors',
                index === active ? 'border-gold-400' : 'border-slate-200',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
