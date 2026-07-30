import { cn } from '@/lib/utils'

interface BrandMarkProps {
  name: string
  tagline?: string | null
  logoUrl?: string | null
  /** 'stacked' nas telas de entrada; 'inline' em cabeçalhos */
  layout?: 'stacked' | 'inline'
  className?: string
}

const BOX = {
  stacked: 'h-16 w-16 rounded-2xl',
  inline: 'h-10 w-10 rounded-xl',
}

/**
 * Logo da marca, com fallback para a inicial sobre o gradiente dourado
 * quando nenhuma imagem foi cadastrada.
 *
 * `object-contain` é obrigatório: um logo cortado ou esticado descaracteriza
 * a identidade. Por isso também não passa pelo next/image, que reencoda.
 */
export function BrandMark({
  name,
  tagline,
  logoUrl,
  layout = 'stacked',
  className,
}: BrandMarkProps) {
  const stacked = layout === 'stacked'

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        stacked && 'flex-col gap-2 text-center',
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          className={cn(BOX[layout], 'shrink-0 object-contain')}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            BOX[layout],
            'accent-gradient flex shrink-0 items-center justify-center font-bold text-white',
            stacked ? 'text-2xl' : 'text-base',
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}

      <span className={cn('min-w-0', stacked && 'block')}>
        <span
          className={cn(
            'block truncate font-bold text-gray-900',
            stacked ? 'text-2xl' : 'text-base',
          )}
        >
          {name}
        </span>
        {tagline && (
          <span className="mt-0.5 block text-sm text-gray-500">{tagline}</span>
        )}
      </span>
    </div>
  )
}
