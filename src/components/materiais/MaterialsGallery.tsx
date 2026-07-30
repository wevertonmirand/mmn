import { Download, FileText, Video } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { MarketingMaterial } from '@/lib/types'

/**
 * Regra estrita: a arte é exibida exatamente como o arquivo original.
 * - object-contain, nunca cover/crop
 * - width/height intrínsecos reservam a proporção real (sem distorção)
 * - nenhum filter, blend mode ou overlay sobre a imagem
 * - <img> puro em vez de next/image para não haver reencode da arte
 */
export function MaterialsGallery({ materials }: { materials: MarketingMaterial[] }) {
  if (materials.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500">Nenhum material publicado ainda.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {materials.map((material) => (
        <Card key={material.id} className="flex flex-col gap-3 p-4">
          <div className="overflow-hidden rounded-xl bg-slate-50">
            {material.type === 'video' ? (
              <video
                src={material.file_url}
                controls
                preload="metadata"
                width={material.width ?? undefined}
                height={material.height ?? undefined}
                className="material-media"
              />
            ) : material.type === 'documento' ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <FileText className="h-10 w-10" aria-hidden />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={material.file_url}
                alt={material.title}
                width={material.width ?? undefined}
                height={material.height ?? undefined}
                loading="lazy"
                decoding="async"
                className="material-media"
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-semibold text-gray-900">{material.title}</h2>
            {material.description && (
              <p className="mt-0.5 text-xs text-gray-500">{material.description}</p>
            )}
            {material.width && material.height && (
              <p className="mt-1 text-xs text-gray-400">
                {material.width} × {material.height} px
              </p>
            )}
          </div>

          <a
            href={material.file_url}
            download
            className="accent-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-gold transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {material.type === 'video' ? (
              <Video className="h-4 w-4" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Baixar original
          </a>
        </Card>
      ))}
    </div>
  )
}
