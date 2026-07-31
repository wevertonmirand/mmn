export type SaleStatus = 'ativa' | 'pendente_cancelamento' | 'cancelada'
export type PrizeStatus = 'solicitado' | 'entregue' | 'recusado'
export type PointsOrigin = 'sale' | 'recruitment' | 'adjustment'
export type MaterialType = 'banner' | 'video' | 'documento'
export type ThemeName = 'gold' | 'slate' | 'emerald'

export type UserRow = {
  id: string
  sponsor_id: string | null
  username: string
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  lifetime_points: number
  current_rank_id: string | null
  is_inactive: boolean
  is_admin: boolean
  inactive_streak: number
  maintenance_fail_streak: number
  joined_at: string
}

export type Rank = {
  id: string
  name: string
  rank_order: number
  required_points: number
  maintenance_points: number
  description: string | null
}

export type Settings = {
  id: boolean
  min_products_monthly: number
  max_network_levels: number
  sale_multiplier: number
  recruitment_multiplier: number
  gamification_enabled: boolean
  theme: ThemeName
  brand_name: string
  brand_tagline: string | null
  logo_url: string | null
  logo_icon_url: string | null
  commission_level_1: number
  commission_level_2: number
  commission_level_3: number
  commission_level_4: number
  commission_level_5: number
}

export type Inventory = { user_id:string; product_id:string; available_quantity:number; sold_quantity:number; average_cost_cents:number; updated_at:string; products?:{name:string}|null }
export type InventoryMovement = { id:string; user_id:string; product_id:string; quantity:number; unit_cost_cents:number; kind:'order_in'|'order_reversal'|'crm_sale'|'crm_cancellation'; order_id:string|null; crm_sale_id:string|null; reverses_id:string|null; created_at:string; products?:{name:string}|null }
export type CrmCustomer = { id:string; user_id:string; name:string; email:string|null; phone:string|null; notes:string|null; created_at:string }
export type CrmSale = { id:string; user_id:string; customer_id:string|null; total_cents:number; cost_cents:number; status:'completed'|'cancelled'; idempotency_key:string; sold_at:string; cancelled_at:string|null }
export type CommissionEntry = { id:string; order_id:string; beneficiary_id:string; buyer_id:string; level:number; percentage:number; base_cents:number; amount_cents:number; status:'credited'|'reversed'; is_reversal:boolean; reverses_id:string|null; created_at:string }

/** Recorte de `settings` legível sem sessão (a vitrine é pública). */
export type PublicBranding = {
  brand_name: string
  brand_tagline: string | null
  logo_url: string | null
  logo_icon_url: string | null
  theme: ThemeName
  gamification_enabled: boolean
}

export type Sale = {
  id: string
  user_id: string
  product_name: string
  quantity: number
  base_points: number
  customer_name: string | null
  notes: string | null
  status: SaleStatus
  cancel_reason: string | null
  cancel_requested_at: string | null
  sold_at: string
}

export type Prize = {
  id: string
  name: string
  description: string | null
  required_points: number
  image_url: string | null
  is_active: boolean
  sort_order: number
}

export type MarketingMaterial = {
  id: string
  title: string
  description: string | null
  type: MaterialType
  file_url: string
  width: number | null
  height: number | null
  is_active: boolean
  sort_order: number
}

/**
 * Nó da árvore de rede, como as RPCs `get_my_network_children` e
 * `get_admin_network_children` devolvem.
 *
 * Quase tudo é anulável de propósito: o banco redige os campos sensíveis
 * fora do nível 1 (o afiliado só contata quem ele mesmo indicou). Tipar
 * assim obriga a UI a tratar a ausência em vez de assumir que veio.
 */
export type NetworkNode = {
  user_id: string
  /** único campo sempre presente */
  full_name: string
  username: string | null
  phone: string | null
  /** nível relativo ao afiliado; null na visão do admin */
  depth: number | null
  is_inactive: boolean | null
  lifetime_points: number | null
  rank_name: string | null
  joined_at: string | null
  /** indicados diretos */
  direct_count: number | null
  /** rede da pessoa, 5 níveis abaixo dela */
  network_count: number | null
  can_expand: boolean
  /** total de irmãos, para paginar */
  total_children: number
}

export type DashboardPayload = {
  user: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
    lifetime_points: number
    rank_name: string | null
    is_inactive: boolean
    inactive_streak: number
    maintenance_fail_streak: number
  }
  settings: {
    gamification_enabled: boolean
    theme: ThemeName
    min_products_monthly: number
  }
  activation: {
    products_this_month: number
    min_required: number
    is_active_this_month: boolean
    at_risk: boolean
  }
  next_prize: Pick<Prize, 'id' | 'name' | 'description' | 'required_points' | 'image_url'> | null
  claimable_prize: Pick<Prize, 'id' | 'name' | 'required_points'> | null
  network: { total: number; directs: number }
}

export type AdminStats = {
  total_users: number
  active_users: number
  inactive_users: number
  at_risk_users: number
  pending_cancellations: number
  pending_prizes: number
  sales_this_month: number
  points_this_month: number
  open_orders: number
  new_orders: number
  orders_revenue_month: number
  active_products: number
  total_customers: number
}

export type PendingCancellation = {
  id: string
  product_name: string
  quantity: number
  base_points: number
  total_points: number
  customer_name: string | null
  cancel_reason: string | null
  cancel_requested_at: string
  sold_at: string
  user_id: string
  username: string
  full_name: string
  points_to_reverse: number
  affected_users: number
}

export type AtRiskUser = {
  id: string
  username: string
  full_name: string
  email: string | null
  phone: string | null
  inactive_streak: number
  is_inactive: boolean
  lifetime_points: number
  rank_name: string | null
  sponsor_username: string | null
  products_this_month: number
  min_required: number
}

export type PrizeRequestRow = {
  id: string
  status: PrizeStatus
  points_at_time: number
  requested_at: string
  delivered_at: string | null
  admin_notes: string | null
  prize_name: string
  required_points: number
  image_url: string | null
  user_id: string
  username: string
  full_name: string
  email: string | null
  phone: string | null
  lifetime_points: number
}

export type OrderStatus = 'novo' | 'em_contato' | 'fechado' | 'cancelado'
export type SuggestionStatus = 'nova' | 'analisando' | 'concluida' | 'recusada'

export type AppSuggestion = {
  id: string
  user_id: string
  message: string
  status: SuggestionStatus
  admin_note: string | null
  created_at: string
}

export type Product = {
  id: string
  name: string
  description: string | null
  sku: string | null
  price_cents: number
  points_value: number
  /** capa, mantida em sincronia com images[0] por trigger */
  image_url: string | null
  /** até 3 fotos; a primeira é a capa */
  images: string[]
  is_active: boolean
  sort_order: number
}

export type Customer = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  referred_by: string | null
}

export type OrderItem = {
  product_name: string
  quantity: number
  unit_price_cents: number
  unit_points: number
}

export type Order = {
  id: string
  order_number: number
  customer_id: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  address: string | null
  customer_notes: string | null
  referred_by: string | null
  status: OrderStatus
  total_cents: number
  total_points: number
  admin_notes: string | null
  contacted_at: string | null
  closed_at: string | null
  cancelled_at: string | null
  created_at: string
}

export type AdminOrder = Order & {
  referred_by_username: string | null
  referred_by_name: string | null
  item_count: number
  items: OrderItem[]
}

/** Item do carrinho no cliente. Preço aqui é só para exibir — o
 *  servidor recalcula tudo a partir do catálogo em place_order. */
export type CartLine = {
  product_id: string
  name: string
  price_cents: number
  points_value: number
  quantity: number
}

export type PlacedOrder = {
  order_id: string
  order_number: number
  items: number
  total_cents: number
  total_points: number
}

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }
type View<Row> = { Row: Row; Relationships: [] }

// Tipagem mínima para o cliente Supabase. Substitua por
// `supabase gen types typescript` quando o projeto estiver linkado.
export type Database = {
  public: {
    Tables: {
      users: Table<UserRow>
      ranks: Table<Rank>
      settings: Table<Settings>
      sales: Table<Sale>
      prizes: Table<Prize>
      prize_requests: Table<{
        id: string
        user_id: string
        prize_id: string
        points_at_time: number
        status: PrizeStatus
        admin_notes: string | null
        requested_at: string
        delivered_at: string | null
      }>
      marketing_materials: Table<MarketingMaterial>
      products: Table<Product>
      customers: Table<Customer>
      orders: Table<Order>
      order_items: Table<OrderItem & { id: string; order_id: string; product_id: string | null }>
      inventory: Table<Inventory>
      inventory_ledger: Table<InventoryMovement>
      crm_customers: Table<CrmCustomer>
      crm_sales: Table<CrmSale>
      commission_ledger: Table<CommissionEntry>
      app_suggestions: Table<AppSuggestion>
    }
    Views: {
      v_users_at_risk: View<AtRiskUser>
      v_pending_cancellations: View<PendingCancellation>
      v_prize_requests: View<PrizeRequestRow>
      v_public_branding: View<PublicBranding>
      v_admin_orders: View<AdminOrder>
    }
    Functions: {
      get_my_dashboard: { Args: Record<string, never>; Returns: DashboardPayload }
      get_admin_stats: { Args: Record<string, never>; Returns: AdminStats }
      // get_full_downline / get_compressed_downline / get_compressed_upline
      // não estão aqui de propósito: leem a árvore inteira sem redação e
      // foram revogadas do cliente na migração 016.
      get_my_network_children: {
        Args: { p_parent?: string | null; p_limit?: number; p_offset?: number }
        Returns: NetworkNode[]
      }
      get_admin_network_children: {
        Args: { p_parent?: string | null; p_limit?: number; p_offset?: number }
        Returns: NetworkNode[]
      }
      search_network: {
        Args: { p_term: string; p_limit?: number }
        Returns: {
          user_id: string
          full_name: string
          username: string | null
          phone: string | null
          is_inactive: boolean
          path_ids: string[]
          path_names: string[]
        }[]
      }
      request_prize: { Args: { p_prize_id: string }; Returns: unknown }
      request_sale_cancellation: {
        Args: { p_sale_id: string; p_reason?: string | null }
        Returns: Sale
      }
      review_sale_cancellation: {
        Args: { p_sale_id: string; p_approve: boolean }
        Returns: Sale
      }
      review_prize_request: {
        Args: { p_request_id: string; p_status: PrizeStatus; p_notes?: string | null }
        Returns: unknown
      }
      fn_close_month: { Args: { p_period?: string | null }; Returns: unknown }
      place_order: {
        Args: {
          p_items: { product_id: string; quantity: number }[]
          p_phone: string
          p_address?: string | null
          p_notes?: string | null
          p_ref?: string | null
        }
        Returns: PlacedOrder
      }
      mark_order_contacted: { Args: { p_order_id: string; p_notes?: string | null }; Returns: Order }
      close_order: { Args: { p_order_id: string; p_notes?: string | null }; Returns: unknown }
      cancel_order: { Args: { p_order_id: string; p_notes?: string | null }; Returns: unknown }
      place_internal_order: { Args: { p_items: { product_id:string; quantity:number }[] }; Returns: PlacedOrder }
      create_crm_sale: { Args: { p_customer_id:string|null; p_items:{product_id:string;quantity:number;unit_price_cents:number}[];p_idempotency_key:string }; Returns:string }
      cancel_crm_sale: { Args:{p_sale_id:string};Returns:undefined }
      remove_affiliate: { Args:{p_user_id:string;p_reason:string};Returns:undefined }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      change_my_username: { Args: { p_username: string }; Returns: string }
    }
    Enums: {
      sale_status: SaleStatus
      prize_status: PrizeStatus
      points_origin: PointsOrigin
      material_type: MaterialType
      order_status: OrderStatus
      suggestion_status: SuggestionStatus
    }
    CompositeTypes: Record<string, never>
  }
}
