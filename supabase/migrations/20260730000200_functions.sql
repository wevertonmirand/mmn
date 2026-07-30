-- =============================================================
-- 002 — Funções de rede, pontuação, ativação e graduação
-- =============================================================

-- -------------------------------------------------------------
-- Helpers de identidade (SECURITY DEFINER para não recursar em RLS)
-- -------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select u.is_admin from public.users u where u.id = auth.uid()), false);
$$;

-- Verifica se p_user está em qualquer nível abaixo de p_ancestor.
-- Sobe a árvore a partir de p_user: é O(profundidade), não O(rede).
create or replace function public.is_in_downline(p_ancestor uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive up as (
    select u.id, u.sponsor_id, 1 as depth
    from public.users u
    where u.id = p_user
    union all
    select p.id, p.sponsor_id, up.depth + 1
    from public.users p
    join up on p.id = up.sponsor_id
    where up.depth < 100
  )
  select exists (select 1 from up where up.sponsor_id = p_ancestor or up.id = p_ancestor)
     and p_ancestor is distinct from p_user;
$$;

-- -------------------------------------------------------------
-- Guarda de integridade da árvore: impede ciclos no sponsor_id.
-- Sem isso, uma rede circular travaria os CTEs recursivos.
-- -------------------------------------------------------------
create or replace function public.fn_prevent_sponsor_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sponsor_id is null then
    return new;
  end if;

  if new.sponsor_id = new.id then
    raise exception 'Um usuário não pode ser patrocinador de si mesmo';
  end if;

  if exists (
    with recursive up as (
      select u.id, u.sponsor_id, 1 as depth
      from public.users u
      where u.id = new.sponsor_id
      union all
      select p.id, p.sponsor_id, up.depth + 1
      from public.users p
      join up on p.id = up.sponsor_id
      where up.depth < 100
    )
    select 1 from up where up.id = new.id
  ) then
    raise exception 'Ciclo detectado na rede: % já está na downline de %', new.sponsor_id, new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists users_prevent_sponsor_cycle on public.users;
create trigger users_prevent_sponsor_cycle
  before insert or update of sponsor_id on public.users
  for each row execute function public.fn_prevent_sponsor_cycle();

-- =============================================================
-- COMPRESSÃO DINÂMICA — DOWNLINE
-- Um usuário inativo não consome nível: seus indicados sobem
-- temporariamente uma posição, então a linha ascendente continua
-- recebendo pontos até o 5º nível VÁLIDO (ativo).
-- =============================================================
create or replace function public.get_compressed_downline(
  p_root      uuid,
  p_max_level int default null
)
returns table (
  user_id         uuid,
  username        text,
  full_name       text,
  sponsor_id      uuid,
  effective_level int,
  real_depth      int,
  is_inactive     boolean,
  lifetime_points int,
  rank_name       text
)
language sql
stable
security definer
set search_path = public
as $$
  with limits as (
    select coalesce(p_max_level, (select s.max_network_levels from public.settings s where s.id), 5) as max_level
  ),
  recursive_tree as (
    with recursive tree as (
      -- nível 1: indicados diretos
      select
        u.id,
        u.username,
        u.full_name,
        u.sponsor_id,
        u.is_inactive,
        u.lifetime_points,
        u.current_rank_id,
        case when u.is_inactive then 0 else 1 end as effective_level,
        1 as real_depth
      from public.users u
      where u.sponsor_id = p_root

      union all

      -- desce: inativo herda o nível do pai (comprimido), ativo soma 1
      select
        c.id,
        c.username,
        c.full_name,
        c.sponsor_id,
        c.is_inactive,
        c.lifetime_points,
        c.current_rank_id,
        t.effective_level + case when c.is_inactive then 0 else 1 end,
        t.real_depth + 1
      from public.users c
      join tree t on c.sponsor_id = t.id
      cross join limits l
      where t.effective_level < l.max_level
        and t.real_depth < 100 -- trava de segurança
    )
    select * from tree
  )
  select
    t.id,
    t.username,
    t.full_name,
    t.sponsor_id,
    t.effective_level,
    t.real_depth,
    t.is_inactive,
    t.lifetime_points,
    r.name
  from recursive_tree t
  cross join limits l
  left join public.ranks r on r.id = t.current_rank_id
  where not t.is_inactive
    and t.effective_level between 1 and l.max_level
  order by t.effective_level, t.username;
$$;

-- Árvore completa para a tela "Minha Rede" (sem limite de nível,
-- inclui inativos para o afiliado poder cobrar reativação).
create or replace function public.get_full_downline(p_root uuid)
returns table (
  user_id         uuid,
  username        text,
  full_name       text,
  sponsor_id      uuid,
  depth           int,
  is_inactive     boolean,
  lifetime_points int,
  rank_name       text,
  joined_at       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with recursive tree as (
    select u.id, u.username, u.full_name, u.sponsor_id, u.is_inactive,
           u.lifetime_points, u.current_rank_id, u.joined_at, 1 as depth
    from public.users u
    where u.sponsor_id = p_root
    union all
    select c.id, c.username, c.full_name, c.sponsor_id, c.is_inactive,
           c.lifetime_points, c.current_rank_id, c.joined_at, t.depth + 1
    from public.users c
    join tree t on c.sponsor_id = t.id
    where t.depth < 100
  )
  select t.id, t.username, t.full_name, t.sponsor_id, t.depth, t.is_inactive,
         t.lifetime_points, r.name, t.joined_at
  from tree t
  left join public.ranks r on r.id = t.current_rank_id
  where public.is_admin()
     or p_root = auth.uid()
     or public.is_in_downline(auth.uid(), p_root)
  order by t.depth, t.username;
$$;

-- =============================================================
-- COMPRESSÃO DINÂMICA — UPLINE
-- Quem recebe os pontos de um evento gerado por p_user.
-- Patrocinadores inativos são pulados sem consumir nível.
-- =============================================================
create or replace function public.get_compressed_upline(
  p_user      uuid,
  p_max_level int default null
)
returns table (user_id uuid, effective_level int)
language sql
stable
security definer
set search_path = public
as $$
  with limits as (
    select coalesce(p_max_level, (select s.max_network_levels from public.settings s where s.id), 5) as max_level
  ),
  walked as (
    with recursive up as (
      select
        u.sponsor_id as id,
        case when s.is_inactive then 0 else 1 end as effective_level,
        1 as real_depth,
        s.is_inactive
      from public.users u
      join public.users s on s.id = u.sponsor_id
      where u.id = p_user

      union all

      select
        c.sponsor_id,
        up.effective_level + case when s.is_inactive then 0 else 1 end,
        up.real_depth + 1,
        s.is_inactive
      from up
      join public.users c on c.id = up.id
      join public.users s on s.id = c.sponsor_id
      cross join limits l
      where up.effective_level < l.max_level
        and up.real_depth < 100
    )
    select * from up
  )
  select w.id, w.effective_level
  from walked w
  cross join limits l
  where not w.is_inactive
    and w.effective_level between 1 and l.max_level;
$$;

-- =============================================================
-- MOTOR DE PONTUAÇÃO
-- Grava o gerador (level 0) + a upline comprimida (1..5),
-- registrando origem e multiplicador correto em cada linha.
-- =============================================================
create or replace function public.fn_distribute_points(
  p_source_user uuid,
  p_origin      public.points_origin,
  p_base_points int,
  p_sale_id     uuid    default null,
  p_reversal    boolean default false,
  p_description text    default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_multiplier int;
  v_points     int := case when p_reversal then -abs(p_base_points) else abs(p_base_points) end;
  v_rows       int := 0;
begin
  if p_base_points = 0 then
    return 0;
  end if;

  select case p_origin
           when 'sale'        then s.sale_multiplier
           when 'recruitment' then s.recruitment_multiplier
           else 1
         end
    into v_multiplier
  from public.settings s
  where s.id;

  v_multiplier := coalesce(v_multiplier, 1);

  -- gerador do evento
  insert into public.points_ledger
    (user_id, source_user_id, origin, base_points, multiplier, level, sale_id, is_reversal, description)
  values
    (p_source_user, p_source_user, p_origin, v_points, v_multiplier, 0, p_sale_id, p_reversal, p_description);
  v_rows := 1;

  -- upline comprimida
  insert into public.points_ledger
    (user_id, source_user_id, origin, base_points, multiplier, level, sale_id, is_reversal, description)
  select u.user_id, p_source_user, p_origin, v_points, v_multiplier, u.effective_level,
         p_sale_id, p_reversal, p_description
  from public.get_compressed_upline(p_source_user) u;

  v_rows := v_rows + coalesce((select count(*)::int from public.get_compressed_upline(p_source_user)), 0);
  return v_rows;
end;
$$;

-- lifetime_points sempre derivado do ledger
create or replace function public.fn_sync_lifetime_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set lifetime_points = greatest(0, lifetime_points + new.points)
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists points_ledger_sync_lifetime on public.points_ledger;
create trigger points_ledger_sync_lifetime
  after insert on public.points_ledger
  for each row execute function public.fn_sync_lifetime_points();

-- -------------------------------------------------------------
-- Venda criada -> pontos peso 1x
-- -------------------------------------------------------------
create or replace function public.fn_sale_award_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'ativa' then
    perform public.fn_distribute_points(
      new.user_id, 'sale', new.base_points * new.quantity, new.id, false,
      format('Venda: %s', new.product_name)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sales_award_points on public.sales;
create trigger sales_award_points
  after insert on public.sales
  for each row execute function public.fn_sale_award_points();

-- -------------------------------------------------------------
-- Novo afiliado -> pontos de recrutamento peso 3x para a upline
-- -------------------------------------------------------------
create or replace function public.fn_recruitment_award_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base int := 1; -- 1 recrutamento = 1 ponto-base, x3 pelo multiplicador
begin
  if new.sponsor_id is not null then
    insert into public.points_ledger
      (user_id, source_user_id, origin, base_points, multiplier, level, description)
    select u.user_id, new.id, 'recruitment', v_base,
           (select s.recruitment_multiplier from public.settings s where s.id),
           u.effective_level,
           format('Recrutamento: @%s', new.username)
    from public.get_compressed_upline(new.id) u;
  end if;
  return new;
end;
$$;

drop trigger if exists users_award_recruitment_points on public.users;
create trigger users_award_recruitment_points
  after insert on public.users
  for each row execute function public.fn_recruitment_award_points();

-- =============================================================
-- CANCELAMENTO DE VENDA
-- Afiliado pede -> status pendente_cancelamento (nada é deletado).
-- Admin aprova -> estorno recursivo na rede.
-- =============================================================
create or replace function public.request_sale_cancellation(
  p_sale_id uuid,
  p_reason  text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;

  if v_sale.id is null then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissão para cancelar esta venda';
  end if;

  if v_sale.status <> 'ativa' then
    raise exception 'Somente vendas ativas podem ter cancelamento solicitado';
  end if;

  update public.sales
     set status = 'pendente_cancelamento',
         cancel_reason = p_reason,
         cancel_requested_at = now()
   where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;

create or replace function public.review_sale_cancellation(
  p_sale_id uuid,
  p_approve boolean
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem revisar cancelamentos';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;

  if v_sale.id is null then
    raise exception 'Venda não encontrada';
  end if;

  if v_sale.status <> 'pendente_cancelamento' then
    raise exception 'Esta venda não está aguardando revisão de cancelamento';
  end if;

  if p_approve then
    -- estorno espelhando os lançamentos originais da venda
    insert into public.points_ledger
      (user_id, source_user_id, origin, base_points, multiplier, level,
       sale_id, is_reversal, reverses_id, description)
    select l.user_id, l.source_user_id, l.origin, -l.base_points, l.multiplier, l.level,
           l.sale_id, true, l.id, format('Estorno de venda cancelada: %s', v_sale.product_name)
    from public.points_ledger l
    where l.sale_id = p_sale_id
      and not l.is_reversal
      and not exists (select 1 from public.points_ledger r where r.reverses_id = l.id);

    update public.sales
       set status = 'cancelada', cancelled_at = now(), reviewed_by = auth.uid()
     where id = p_sale_id
    returning * into v_sale;
  else
    update public.sales
       set status = 'ativa', cancel_reason = null,
           cancel_requested_at = null, reviewed_by = auth.uid()
     where id = p_sale_id
    returning * into v_sale;
  end if;

  return v_sale;
end;
$$;

-- =============================================================
-- FECHAMENTO MENSAL
-- 1) Ativação: products_count >= min_products_monthly.
--    3 meses consecutivos sem bater a meta -> is_inactive = true.
-- 2) Graduação: 1 mês de grace period. 2 meses consecutivos
--    abaixo dos pontos de manutenção -> rebaixa 1 rank.
-- =============================================================
-- Os nomes das colunas de saída são prefixados para não colidirem com as
-- colunas de monthly_activity dentro do corpo PL/pgSQL (ON CONFLICT).
create or replace function public.fn_close_month(p_period date default null)
returns table (
  out_user_id         uuid,
  out_is_active       boolean,
  out_became_inactive boolean,
  out_demoted         boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period       date;
  v_min_products int;
  r              record;
  v_active       boolean;
  v_inactive     boolean;
  v_demoted      boolean;
  v_new_rank     uuid;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem executar o fechamento mensal';
  end if;

  v_period := date_trunc('month', coalesce(p_period, (now() - interval '1 month')))::date;
  select s.min_products_monthly into v_min_products from public.settings s where s.id;

  for r in
    select
      u.id,
      u.current_rank_id,
      u.inactive_streak,
      u.maintenance_fail_streak,
      coalesce(rk.rank_order, 0)         as rank_order,
      coalesce(rk.maintenance_points, 0) as maintenance_points,
      coalesce(sales.products, 0)        as products,
      coalesce(pts.personal, 0)          as personal_points,
      coalesce(pts.network, 0)           as network_points
    from public.users u
    left join public.ranks rk on rk.id = u.current_rank_id
    left join (
      select s.user_id, sum(s.quantity)::int as products
      from public.sales s
      where s.status = 'ativa'
        and date_trunc('month', s.sold_at)::date = v_period
      group by s.user_id
    ) sales on sales.user_id = u.id
    left join (
      select l.user_id,
             sum(case when l.level = 0 then l.points else 0 end)::int as personal,
             sum(case when l.level > 0 then l.points else 0 end)::int as network
      from public.points_ledger l
      where date_trunc('month', l.created_at)::date = v_period
      group by l.user_id
    ) pts on pts.user_id = u.id
    where not u.is_admin
  loop
    v_active   := r.products >= v_min_products;
    v_inactive := false;
    v_demoted  := false;

    -- ---- ativação ----
    if v_active then
      update public.users
         set inactive_streak = 0, is_inactive = false
       where id = r.id;
    else
      if r.inactive_streak + 1 >= 3 then
        v_inactive := true;
      end if;
      update public.users
         set inactive_streak = r.inactive_streak + 1,
             is_inactive = (r.inactive_streak + 1 >= 3)
       where id = r.id;
    end if;

    -- ---- manutenção de graduação (grace period de 1 mês) ----
    if r.current_rank_id is not null and r.maintenance_points > 0 then
      if (r.personal_points + r.network_points) >= r.maintenance_points then
        update public.users set maintenance_fail_streak = 0 where id = r.id;
      elsif r.maintenance_fail_streak + 1 >= 2 then
        select rk.id into v_new_rank
        from public.ranks rk
        where rk.rank_order < r.rank_order
        order by rk.rank_order desc
        limit 1;

        update public.users
           set current_rank_id = coalesce(v_new_rank, current_rank_id),
               maintenance_fail_streak = 0
         where id = r.id;

        v_demoted := v_new_rank is not null;
      else
        -- 1º mês abaixo da meta: apenas consome a tolerância
        update public.users
           set maintenance_fail_streak = r.maintenance_fail_streak + 1
         where id = r.id;
      end if;
    end if;

    insert into public.monthly_activity
      (user_id, period, products_count, personal_points, network_points,
       min_required, is_active, rank_id, closed_at)
    values
      (r.id, v_period, r.products, r.personal_points, r.network_points,
       v_min_products, v_active, r.current_rank_id, now())
    on conflict (user_id, period) do update
      set products_count  = excluded.products_count,
          personal_points = excluded.personal_points,
          network_points  = excluded.network_points,
          min_required    = excluded.min_required,
          is_active       = excluded.is_active,
          rank_id         = excluded.rank_id,
          closed_at       = now();

    return query select r.id, v_active, v_inactive, v_demoted;
  end loop;
end;
$$;

-- -------------------------------------------------------------
-- Promoção por pontos acumulados (chamada após ganho de pontos)
-- -------------------------------------------------------------
create or replace function public.fn_recalculate_rank(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int;
  v_rank   uuid;
begin
  select lifetime_points into v_points from public.users where id = p_user;

  select id into v_rank
  from public.ranks
  where required_points <= coalesce(v_points, 0)
  order by rank_order desc
  limit 1;

  if v_rank is not null then
    update public.users
       set current_rank_id = v_rank
     where id = p_user
       and (current_rank_id is null
            or (select rank_order from public.ranks where id = current_rank_id)
                < (select rank_order from public.ranks where id = v_rank));
  end if;

  return v_rank;
end;
$$;

-- =============================================================
-- Status do afiliado para o dashboard (1 chamada, 1 payload)
-- =============================================================
create or replace function public.get_my_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select u.*, r.name as rank_name, r.rank_order
    from public.users u
    left join public.ranks r on r.id = u.current_rank_id
    where u.id = auth.uid()
  ),
  cfg as (select * from public.settings where id),
  next_prize as (
    select p.id, p.name, p.description, p.required_points, p.image_url
    from public.prizes p, me
    where p.is_active and p.required_points > me.lifetime_points
    order by p.required_points asc
    limit 1
  ),
  claimable as (
    select p.id, p.name, p.required_points
    from public.prizes p, me
    where p.is_active
      and p.required_points <= me.lifetime_points
      and not exists (
        select 1 from public.prize_requests pr
        where pr.prize_id = p.id and pr.user_id = me.id
      )
    order by p.required_points desc
    limit 1
  ),
  current_period as (
    select coalesce(sum(s.quantity), 0)::int as products
    from public.sales s, me
    where s.user_id = me.id
      and s.status = 'ativa'
      and date_trunc('month', s.sold_at) = date_trunc('month', now())
  ),
  network_size as (
    select count(*)::int as total,
           count(*) filter (where d.depth = 1)::int as directs
    from me, public.get_full_downline(me.id) d
  )
  select jsonb_build_object(
    'user', jsonb_build_object(
      'id', me.id,
      'username', me.username,
      'full_name', me.full_name,
      'avatar_url', me.avatar_url,
      'lifetime_points', me.lifetime_points,
      'rank_name', me.rank_name,
      'is_inactive', me.is_inactive,
      'inactive_streak', me.inactive_streak,
      'maintenance_fail_streak', me.maintenance_fail_streak
    ),
    'settings', jsonb_build_object(
      'gamification_enabled', cfg.gamification_enabled,
      'theme', cfg.theme,
      'min_products_monthly', cfg.min_products_monthly
    ),
    'activation', jsonb_build_object(
      'products_this_month', cp.products,
      'min_required', cfg.min_products_monthly,
      'is_active_this_month', cp.products >= cfg.min_products_monthly,
      'at_risk', me.inactive_streak >= 2
    ),
    'next_prize', (select to_jsonb(n) from next_prize n),
    'claimable_prize', (select to_jsonb(c) from claimable c),
    'network', jsonb_build_object('total', ns.total, 'directs', ns.directs)
  )
  from me, cfg, current_period cp, network_size ns;
$$;

-- -------------------------------------------------------------
-- Solicitar prêmio (valida pontos no servidor, nunca no cliente)
-- -------------------------------------------------------------
create or replace function public.request_prize(p_prize_id uuid)
returns public.prize_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points  int;
  v_needed  int;
  v_request public.prize_requests;
begin
  select lifetime_points into v_points from public.users where id = auth.uid();

  select required_points into v_needed
  from public.prizes where id = p_prize_id and is_active;

  if v_needed is null then
    raise exception 'Prêmio indisponível';
  end if;

  if coalesce(v_points, 0) < v_needed then
    raise exception 'Pontuação insuficiente: % de % pontos', coalesce(v_points, 0), v_needed;
  end if;

  insert into public.prize_requests (user_id, prize_id, points_at_time)
  values (auth.uid(), p_prize_id, v_points)
  returning * into v_request;

  return v_request;
end;
$$;
