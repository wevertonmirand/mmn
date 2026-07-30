export type SaleStatus = 'ativa' | 'pendente_cancelamento' | 'cancelada'
export type PrizeStatus = 'solicitado' | 'entregue' | 'recusado'
export type PointsOrigin = 'sale' | 'recruitment' | 'adjustment'
export type MaterialType = 'banner' | 'video' | 'documento'
export type ThemeName = 'gold' | 'slate' | 'emerald'

export interface UserRow {
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

export interface Rank {
  id: string
  name: string
  rank_order: number
  required_points: number
  maintenance_points: number
  description: string | null
}

export interface Settings {
  id: boolean
  min_products_monthly: number
  max_network_levels: number
  sale_multiplier: number
  recruitment_multiplier: number
  gamification_enabled: boolean
  theme: ThemeName
}

export interface Sale {
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

export interface Prize {
  id: string
  name: string
  description: string | null
  required_points: number
  image_url: string | null
  is_active: boolean
  sort_order: number
}

export interface MarketingMaterial {
  id: string
  title: string
  description: string | null
  type: MaterialType
  file_url: string
  width: number | null
  height: number | null
  sort_order: number
}

export interface DownlineNode {
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

export interface DashboardPayload {
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

export interface AdminStats {
  total_users: number
  active_users: number
  inactive_users: number
  at_risk_users: number
  pending_cancellations: number
  pending_prizes: number
  sales_this_month: number
  points_this_month: number
}

export interface PendingCancellation {
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

export interface AtRiskUser {
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

export interface PrizeRequestRow {
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

// Tipagem mínima para o cliente Supabase. Substitua por
// `supabase gen types typescript` quando o projeto estiver linkado.
export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow> }
      ranks: { Row: Rank; Insert: Partial<Rank>; Update: Partial<Rank> }
      settings: { Row: Settings; Insert: Partial<Settings>; Update: Partial<Settings> }
      sales: { Row: Sale; Insert: Partial<Sale>; Update: Partial<Sale> }
      prizes: { Row: Prize; Insert: Partial<Prize>; Update: Partial<Prize> }
      marketing_materials: {
        Row: MarketingMaterial
        Insert: Partial<MarketingMaterial>
        Update: Partial<MarketingMaterial>
      }
    }
    Views: {
      v_users_at_risk: { Row: AtRiskUser }
      v_pending_cancellations: { Row: PendingCancellation }
      v_prize_requests: { Row: PrizeRequestRow }
    }
    Functions: Record<string, unknown>
  }
}
