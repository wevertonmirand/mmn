-- =============================================================
-- 004 — Consultas do painel administrativo
-- Views com security_invoker: o RLS de quem chama continua valendo.
-- =============================================================

-- Afiliados prestes a ficar inativos (2 meses sem ativação) —
-- lista de contato preventivo do admin.
create or replace view public.v_users_at_risk
with (security_invoker = true) as
select
  u.id,
  u.username,
  u.full_name,
  u.email,
  u.phone,
  u.inactive_streak,
  u.is_inactive,
  u.lifetime_points,
  r.name as rank_name,
  sp.username as sponsor_username,
  coalesce(cur.products, 0) as products_this_month,
  (select s.min_products_monthly from public.settings s where s.id) as min_required
from public.users u
left join public.ranks r  on r.id = u.current_rank_id
left join public.users sp on sp.id = u.sponsor_id
left join (
  select s.user_id, sum(s.quantity)::int as products
  from public.sales s
  where s.status = 'ativa'
    and date_trunc('month', s.sold_at) = date_trunc('month', now())
  group by s.user_id
) cur on cur.user_id = u.id
where not u.is_admin
  and (u.inactive_streak >= 2 or u.is_inactive)
order by u.is_inactive desc, u.inactive_streak desc, u.username;

-- Fila de cancelamentos aguardando decisão
create or replace view public.v_pending_cancellations
with (security_invoker = true) as
select
  s.id,
  s.product_name,
  s.quantity,
  s.base_points,
  s.quantity * s.base_points as total_points,
  s.customer_name,
  s.cancel_reason,
  s.cancel_requested_at,
  s.sold_at,
  u.id       as user_id,
  u.username,
  u.full_name,
  -- impacto real do estorno na rede, se aprovado
  (select coalesce(sum(l.points), 0)
     from public.points_ledger l
    where l.sale_id = s.id and not l.is_reversal) as points_to_reverse,
  (select count(distinct l.user_id)
     from public.points_ledger l
    where l.sale_id = s.id and not l.is_reversal) as affected_users
from public.sales s
join public.users u on u.id = s.user_id
where s.status = 'pendente_cancelamento'
order by s.cancel_requested_at asc;

-- Fila de prêmios solicitados
create or replace view public.v_prize_requests
with (security_invoker = true) as
select
  pr.id,
  pr.status,
  pr.points_at_time,
  pr.requested_at,
  pr.delivered_at,
  pr.admin_notes,
  p.name        as prize_name,
  p.required_points,
  p.image_url,
  u.id          as user_id,
  u.username,
  u.full_name,
  u.email,
  u.phone,
  u.lifetime_points
from public.prize_requests pr
join public.prizes p on p.id = pr.prize_id
join public.users  u on u.id = pr.user_id
order by
  case pr.status when 'solicitado' then 0 when 'entregue' then 1 else 2 end,
  pr.requested_at asc;

-- -------------------------------------------------------------
-- Marcar prêmio como entregue / recusado
-- -------------------------------------------------------------
create or replace function public.review_prize_request(
  p_request_id uuid,
  p_status     public.prize_status,
  p_notes      text default null
)
returns public.prize_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.prize_requests;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem revisar solicitações de prêmio';
  end if;

  if p_status not in ('entregue', 'recusado') then
    raise exception 'Status inválido para revisão: %', p_status;
  end if;

  update public.prize_requests
     set status       = p_status,
         admin_notes  = coalesce(p_notes, admin_notes),
         reviewed_by  = auth.uid(),
         delivered_at = case when p_status = 'entregue' then now() else null end
   where id = p_request_id
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Solicitação não encontrada';
  end if;

  return v_request;
end;
$$;

-- -------------------------------------------------------------
-- Estatísticas do topo do painel admin
-- -------------------------------------------------------------
create or replace function public.get_admin_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_admin() then '{}'::jsonb else jsonb_build_object(
    'total_users',           (select count(*) from public.users where not is_admin),
    'active_users',          (select count(*) from public.users where not is_admin and not is_inactive),
    'inactive_users',        (select count(*) from public.users where not is_admin and is_inactive),
    'at_risk_users',         (select count(*) from public.users where not is_admin and not is_inactive and inactive_streak >= 2),
    'pending_cancellations', (select count(*) from public.sales where status = 'pendente_cancelamento'),
    'pending_prizes',        (select count(*) from public.prize_requests where status = 'solicitado'),
    'sales_this_month',      (select coalesce(sum(quantity), 0) from public.sales
                               where status = 'ativa'
                                 and date_trunc('month', sold_at) = date_trunc('month', now())),
    'points_this_month',     (select coalesce(sum(points), 0) from public.points_ledger
                               where level = 0
                                 and date_trunc('month', created_at) = date_trunc('month', now()))
  ) end;
$$;

-- As views usam security_invoker, então o RLS de quem chama continua valendo:
-- um afiliado que consultar estas views só enxerga o que suas policies permitem.
grant select on public.v_users_at_risk, public.v_pending_cancellations,
                public.v_prize_requests to authenticated;

grant execute on function public.review_prize_request(uuid, public.prize_status, text) to authenticated;
grant execute on function public.get_admin_stats() to authenticated;
