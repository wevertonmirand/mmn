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

export type DownlineNode = {
  user_id: string
  username: string
  full_name: string
  sponsor_id: string | null
  depth: number
  is_inactive: boolean
  lifetime_points: number
  rank_name: string | null
  joined_at: string
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
    }
    Views: {
      v_users_at_risk: View<AtRiskUser>
      v_pending_cancellations: View<PendingCancellation>
      v_prize_requests: View<PrizeRequestRow>
    }
    Functions: {
      get_my_dashboard: { Args: Record<string, never>; Returns: DashboardPayload }
      get_admin_stats: { Args: Record<string, never>; Returns: AdminStats }
      get_full_downline: { Args: { p_root: string }; Returns: DownlineNode[] }
      get_compressed_downline: {
        Args: { p_root: string; p_max_level?: number | null }
        Returns: DownlineNode[]
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
    }
    Enums: {
      sale_status: SaleStatus
      prize_status: PrizeStatus
      points_origin: PointsOrigin
      material_type: MaterialType
    }
    CompositeTypes: Record<string, never>
  }
}
