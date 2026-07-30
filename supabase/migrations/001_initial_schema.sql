-- Aurum: schema inicial, motor de pontos e segurança (Supabase/PostgreSQL).
create extension if not exists pgcrypto;

create type public.point_origin as enum ('product_sale', 'affiliate_recruitment');
create type public.sale_status as enum ('confirmed', 'pending_cancellation', 'cancelled');
create type public.reward_request_status as enum ('requested', 'delivered', 'rejected');

create table public.ranks (
  id bigint generated always as identity primary key,
  name text not null unique,
  maintenance_points integer not null check (maintenance_points >= 0),
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  sponsor_id uuid references public.users(id) on delete restrict,
  username text not null unique check (username ~ '^[a-z0-9_]{3,40}$'),
  lifetime_points bigint not null default 0 check (lifetime_points >= 0),
  current_rank_id bigint references public.ranks(id),
  is_inactive boolean not null default false,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  check (id is distinct from sponsor_id)
);
create index users_sponsor_idx on public.users(sponsor_id);

create table public.settings (
  singleton boolean primary key default true check (singleton),
  monthly_product_minimum integer not null default 1 check (monthly_product_minimum >= 0),
  gamification_enabled boolean not null default true,
  theme text not null default 'gold' check (theme in ('gold','graphite')),
  updated_at timestamptz not null default now()
);
insert into public.settings(singleton) values (true);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  product text not null check (length(trim(product)) > 0),
  product_quantity integer not null default 1 check (product_quantity > 0),
  base_points integer not null check (base_points > 0),
  status public.sale_status not null default 'confirmed',
  cancellation_requested_at timestamptz,
  cancellation_reviewed_at timestamptz,
  cancellation_reviewed_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create index sales_user_month_idx on public.sales(user_id, created_at);

create table public.points_ledger (
  id bigint generated always as identity primary key,
  beneficiary_id uuid not null references public.users(id),
  source_user_id uuid not null references public.users(id),
  origin public.point_origin not null,
  source_id uuid not null,
  base_points integer not null check (base_points > 0),
  multiplier smallint not null,
  points integer generated always as (base_points * multiplier) stored,
  network_level smallint check (network_level between 0 and 5),
  is_reversal boolean not null default false,
  reversed_ledger_id bigint references public.points_ledger(id),
  created_at timestamptz not null default now(),
  check ((origin = 'product_sale' and multiplier = 1) or (origin = 'affiliate_recruitment' and multiplier = 3)),
  check ((not is_reversal and reversed_ledger_id is null) or (is_reversal and reversed_ledger_id is not null)),
  unique (beneficiary_id, origin, source_id, network_level, is_reversal)
);
create index ledger_beneficiary_idx on public.points_ledger(beneficiary_id, created_at);

create table public.monthly_activity (
  user_id uuid not null references public.users(id),
  month date not null check (month = date_trunc('month', month)::date),
  products_sold integer not null default 0,
  points_earned integer not null default 0,
  met_activation boolean not null default false,
  met_rank_maintenance boolean not null default false,
  rank_id_at_close bigint references public.ranks(id),
  primary key (user_id, month)
);

create table public.rank_history (
  user_id uuid not null references public.users(id),
  month date not null,
  rank_id bigint references public.ranks(id),
  maintenance_met boolean not null,
  primary key(user_id, month)
);

create table public.rewards (
  id bigint generated always as identity primary key,
  name text not null,
  points_required integer not null check(points_required > 0),
  description text not null default '',
  active boolean not null default true
);
create table public.reward_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  reward_id bigint not null references public.rewards(id),
  status public.reward_request_status not null default 'requested',
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique(user_id, reward_id, status)
);

create table public.marketing_materials (
  id bigint generated always as identity primary key,
  title text not null,
  file_url text not null,
  media_type text not null check(media_type in ('image','video')),
  created_at timestamptz not null default now()
);

-- Árvore comprimida: usuários inativos são atravessados sem consumir nível válido.
create or replace function public.compressed_downline(root_id uuid, max_valid_depth integer default 5)
returns table(user_id uuid, sponsor_id uuid, username text, valid_level integer)
language sql stable security definer set search_path = public as $$
  with recursive tree as (
    select u.id, u.sponsor_id, u.username, u.is_inactive,
           case when u.is_inactive then 0 else 1 end as depth,
           array[root_id, u.id]::uuid[] as path
      from public.users u where u.sponsor_id = root_id
    union all
    select u.id, u.sponsor_id, u.username, u.is_inactive,
           t.depth + case when u.is_inactive then 0 else 1 end,
           t.path || u.id
      from tree t join public.users u on u.sponsor_id = t.id
     where t.depth < max_valid_depth and not u.id = any(t.path)
  )
  select id, sponsor_id, username, depth from tree
   where not is_inactive and depth between 1 and max_valid_depth;
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select is_super_admin from public.users where id=auth.uid()),false);
$$;

-- Fechamento mensal: 3 falhas de ativação inativam; 2 falhas de manutenção rebaixam
-- para a graduação registrada no mês anterior (um mês de tolerância).
create or replace function public.close_month(target_month date)
returns void language plpgsql security definer set search_path = public as $$
declare min_products integer;
begin
  if not public.is_super_admin() then raise exception 'admin only'; end if;
  target_month := date_trunc('month', target_month)::date;
  select monthly_product_minimum into min_products from public.settings where singleton;
  insert into public.monthly_activity(user_id, month, products_sold, points_earned, met_activation, met_rank_maintenance, rank_id_at_close)
  select u.id, target_month,
    coalesce(s.products,0), coalesce(l.points,0), coalesce(s.products,0) >= min_products,
    coalesce(l.points,0) >= coalesce(r.maintenance_points,0), u.current_rank_id
  from public.users u left join public.ranks r on r.id=u.current_rank_id
  left join lateral (select sum(product_quantity)::integer products from public.sales where user_id=u.id and status='confirmed' and created_at>=target_month and created_at<target_month+interval '1 month') s on true
  left join lateral (select sum(case when is_reversal then -points else points end)::integer points from public.points_ledger where beneficiary_id=u.id and created_at>=target_month and created_at<target_month+interval '1 month') l on true
  on conflict(user_id,month) do update set products_sold=excluded.products_sold,points_earned=excluded.points_earned,met_activation=excluded.met_activation,met_rank_maintenance=excluded.met_rank_maintenance,rank_id_at_close=excluded.rank_id_at_close;

  update public.users u set is_inactive = true where not exists (
    select 1 from public.monthly_activity a where a.user_id=u.id and a.month in (target_month,target_month-interval '1 month',target_month-interval '2 months') and a.met_activation
  ) and (select count(*) from public.monthly_activity a where a.user_id=u.id and a.month in (target_month,target_month-interval '1 month',target_month-interval '2 months'))=3;

  update public.users u set current_rank_id = prior.rank_id_at_close
  from public.monthly_activity current_m join public.monthly_activity previous_m on previous_m.user_id=current_m.user_id and previous_m.month=target_month-interval '1 month'
  join public.monthly_activity prior on prior.user_id=current_m.user_id and prior.month=target_month-interval '1 month'
  where u.id=current_m.user_id and current_m.month=target_month and not current_m.met_rank_maintenance and not previous_m.met_rank_maintenance;
end $$;

-- Impede clientes de falsificarem multiplicadores/origens; o backend usa RPC/service role.
create or replace function public.record_points(p_source_user uuid, p_origin public.point_origin, p_source_id uuid, p_base_points integer)
returns void language plpgsql security definer set search_path=public as $$
declare m smallint := case when p_origin='product_sale' then 1 else 3 end;
begin
  if auth.uid() is not null and auth.uid()<>p_source_user and not public.is_super_admin() then raise exception 'forbidden'; end if;
  insert into public.points_ledger(beneficiary_id,source_user_id,origin,source_id,base_points,multiplier,network_level)
  values(p_source_user,p_source_user,p_origin,p_source_id,p_base_points,m,0);
  insert into public.points_ledger(beneficiary_id,source_user_id,origin,source_id,base_points,multiplier,network_level)
  select ancestor.id,p_source_user,p_origin,p_source_id,p_base_points,m,ancestor.level
  from (
    with recursive up as (
      select u.sponsor_id as id, 1 as level, array[p_source_user]::uuid[] path from public.users u where u.id=p_source_user
      union all select u.sponsor_id, up.level+case when u.is_inactive then 0 else 1 end, up.path||u.id from up join public.users u on u.id=up.id where up.level<=5 and not u.id=any(up.path)
    ) select up.id,up.level from up join public.users u on u.id=up.id where not u.is_inactive and up.level<=5
  ) ancestor;
end $$;

-- Aprovar um cancelamento mantém auditoria: cria lançamentos inversos para todos os
-- beneficiários originalmente pontuados e jamais apaga a venda ou o ledger original.
create or replace function public.approve_sale_cancellation(p_sale_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_super_admin() then raise exception 'admin only'; end if;
  if not exists(select 1 from public.sales where id=p_sale_id and status='pending_cancellation') then
    raise exception 'sale is not pending cancellation';
  end if;
  insert into public.points_ledger(beneficiary_id,source_user_id,origin,source_id,base_points,multiplier,network_level,is_reversal,reversed_ledger_id)
  select beneficiary_id,source_user_id,origin,source_id,base_points,multiplier,network_level,true,id
  from public.points_ledger where source_id=p_sale_id and origin='product_sale' and not is_reversal;
  update public.sales set status='cancelled', cancellation_reviewed_at=now(), cancellation_reviewed_by=auth.uid() where id=p_sale_id;
end $$;

create or replace function public.sync_lifetime_points()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.users set lifetime_points = greatest(0, lifetime_points + case when new.is_reversal then -new.points else new.points end)
  where id=new.beneficiary_id;
  return new;
end $$;
create trigger ledger_sync_lifetime after insert on public.points_ledger for each row execute function public.sync_lifetime_points();

-- Helpers RLS evitam políticas recursivas e garantem que só a downline seja visível.
create or replace function public.is_in_downline(viewer uuid, candidate uuid)
returns boolean language sql stable security definer set search_path=public as $$
  with recursive descendants as (
    select id from public.users where sponsor_id=viewer
    union all select u.id from public.users u join descendants d on u.sponsor_id=d.id
  ) select exists(select 1 from descendants where id=candidate);
$$;

alter table public.users enable row level security;
alter table public.sales enable row level security;
alter table public.points_ledger enable row level security;
alter table public.monthly_activity enable row level security;
alter table public.rank_history enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_requests enable row level security;
alter table public.marketing_materials enable row level security;
alter table public.settings enable row level security;

create policy users_read_self_downline on public.users for select using (id=auth.uid() or public.is_in_downline(auth.uid(),id) or public.is_super_admin());
create policy users_admin_write on public.users for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy sales_own_read on public.sales for select using(user_id=auth.uid() or public.is_super_admin());
create policy sales_own_insert on public.sales for insert with check(user_id=auth.uid() and status='confirmed');
create policy sales_request_cancel on public.sales for update using(user_id=auth.uid() and status='confirmed') with check(user_id=auth.uid() and status='pending_cancellation');
create policy sales_admin on public.sales for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy ledger_own_read on public.points_ledger for select using(beneficiary_id=auth.uid() or public.is_super_admin());
create policy activity_own_read on public.monthly_activity for select using(user_id=auth.uid() or public.is_super_admin());
create policy rank_history_own_read on public.rank_history for select using(user_id=auth.uid() or public.is_super_admin());
create policy rewards_read on public.rewards for select using(auth.uid() is not null);
create policy rewards_admin on public.rewards for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy reward_requests_own_read on public.reward_requests for select using(user_id=auth.uid() or public.is_super_admin());
create policy reward_requests_own_insert on public.reward_requests for insert with check(user_id=auth.uid() and status='requested');
create policy reward_requests_admin on public.reward_requests for update using(public.is_super_admin()) with check(public.is_super_admin());
create policy materials_read on public.marketing_materials for select using(auth.uid() is not null);
create policy materials_admin on public.marketing_materials for all using(public.is_super_admin()) with check(public.is_super_admin());
create policy settings_read on public.settings for select using(auth.uid() is not null);
create policy settings_admin on public.settings for all using(public.is_super_admin()) with check(public.is_super_admin());

revoke insert, update, delete on public.points_ledger from authenticated;
grant execute on function public.compressed_downline(uuid,integer) to authenticated;
revoke execute on function public.close_month(date) from public, anon, authenticated;
grant execute on function public.close_month(date) to service_role;
revoke execute on function public.record_points(uuid,public.point_origin,uuid,integer) from public, anon;
grant execute on function public.record_points(uuid,public.point_origin,uuid,integer) to authenticated, service_role;
revoke execute on function public.approve_sale_cancellation(uuid) from public, anon, authenticated;
grant execute on function public.approve_sale_cancellation(uuid) to service_role;
