'use server'

import { createClient } from '@/lib/supabase/server'
import type { NetworkNode } from '@/lib/types'

export type NetworkNodesResult =
  | { ok: true; nodes: NetworkNode[] }
  | { ok: false; error: string }

/**
 * Carrega um nível da árvore por vez.
 *
 * São server actions em vez do client do Supabase porque a árvore é um
 * client component: ele não recebe função comum como prop, mas recebe
 * server action — é assim que a mesma árvore serve /rede e /admin/rede.
 *
 * Buscar sob demanda também é o que mantém a privacidade honesta: a
 * redação é refeita pelo banco a cada expansão, então telefone de nível 3
 * nunca chega ao navegador, nem em payload que a UI decida não mostrar.
 */
export async function loadMyNetworkAction(
  parentId: string | null,
  offset = 0,
): Promise<NetworkNodesResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_network_children', {
    p_parent: parentId,
    p_offset: offset,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, nodes: (data ?? []) as NetworkNode[] }
}

export type NetworkSearchHit = {
  user_id: string
  full_name: string
  username: string | null
  phone: string | null
  is_inactive: boolean
  /** da raiz até a pessoa, incluindo ela */
  path_ids: string[]
  path_names: string[]
}

export type NetworkSearchResult =
  | { ok: true; hits: NetworkSearchHit[] }
  | { ok: false; error: string }

/** Busca do admin: encontra em qualquer profundidade e devolve o caminho. */
export async function searchNetworkAction(term: string): Promise<NetworkSearchResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_network', { p_term: term })
  if (error) return { ok: false, error: error.message }
  return { ok: true, hits: (data ?? []) as NetworkSearchHit[] }
}

export async function loadAdminNetworkAction(
  parentId: string | null,
  offset = 0,
): Promise<NetworkNodesResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_admin_network_children', {
    p_parent: parentId,
    p_offset: offset,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, nodes: (data ?? []) as NetworkNode[] }
}
