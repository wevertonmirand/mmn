import { createClient } from '@/lib/supabase/server'
import { MaterialsGallery } from '@/components/materiais/MaterialsGallery'
import type { MarketingMaterial } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MateriaisPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('marketing_materials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Materiais de marketing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Baixe as artes originais, sem cortes ou alterações.
        </p>
      </div>
      <MaterialsGallery materials={(data ?? []) as MarketingMaterial[]} />
    </div>
  )
}
