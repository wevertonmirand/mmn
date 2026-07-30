-- =============================================================
-- 003 — Row Level Security
-- Princípio: o afiliado vê a si mesmo e a sua downline. Crossline
-- (rede de terceiros) é bloqueada no banco, não na UI.
-- Escrita em pontos/status é sempre via RPC SECURITY DEFINER.
-- =============================================================

alter table public.users               enable row level security;
alter table public.ranks               enable row level security;
alter table public.settings            enable row level security;
alter table public.sales               enable row level security;
alter table public.points_ledger       enable row level security;
alter table public.monthly_activity    enable row level security;
alter table public.prizes              enable row level security;
alter table public.prize_requests      enable row level security;
alter table public.marketing_materials enable row level security;

-- -------------------------------------------------------------
-- Helpers SECURITY DEFINER.
-- Uma policy de `users` NÃO pode consultar `users` diretamente:
-- o Postgres reaplica a policy na subquery e aborta com
-- "infinite recursion detected in policy". Estas funções rodam como
-- o owner, fora do RLS, e quebram o ciclo.
-- -------------------------------------------------------------
create or replace function public.my_sponsor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.sponsor_id from public.users u where u.id = auth.uid();
$$;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated
  using (id = auth.uid());

drop policy if exists users_select_downline on public.users;
create policy users_select_downline on public.users
  for select to authenticated
  using (public.is_in_downline(auth.uid(), id));

-- necessário para renderizar "meu patrocinador" (apenas o direto)
drop policy if exists users_select_own_sponsor on public.users;
create policy users_select_own_sponsor on public.users
  for select to authenticated
  using (id = public.my_sponsor_id());

drop policy if exists users_select_admin on public.users;
create policy users_select_admin on public.users
  for select to authenticated
  using (public.is_admin());

-- O afiliado só altera a própria linha. Quais COLUNAS ele pode alterar é
-- responsabilidade do trigger users_guard_protected_columns abaixo — uma
-- policy não consegue comparar new vs old sem consultar `users` e recursar.
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -------------------------------------------------------------
-- Imutabilidade das colunas sensíveis para requisições de cliente.
-- Requisições do PostgREST rodam como `authenticated`/`anon`; as RPCs
-- SECURITY DEFINER rodam como o owner, então continuam podendo escrever
-- pontos, rank e flags de ciclo.
-- -------------------------------------------------------------
create or replace function public.fn_users_guard_protected_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if new.id                      is distinct from old.id
     or new.sponsor_id              is distinct from old.sponsor_id
     or new.username                is distinct from old.username
     or new.lifetime_points         is distinct from old.lifetime_points
     or new.current_rank_id         is distinct from old.current_rank_id
     or new.is_inactive             is distinct from old.is_inactive
     or new.is_admin                is distinct from old.is_admin
     or new.inactive_streak         is distinct from old.inactive_streak
     or new.maintenance_fail_streak is distinct from old.maintenance_fail_streak
  then
    raise exception 'Alteração não permitida: rede, pontos, graduação e permissões são geridos pelo sistema';
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_protected_columns on public.users;
create trigger users_guard_protected_columns
  before update on public.users
  for each row execute function public.fn_users_guard_protected_columns();

drop policy if exists users_all_admin on public.users;
create policy users_all_admin on public.users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------------
-- ranks / prizes / marketing_materials — leitura pública autenticada
-- -------------------------------------------------------------
drop policy if exists ranks_select_all on public.ranks;
create policy ranks_select_all on public.ranks
  for select to authenticated using (true);

drop policy if exists ranks_write_admin on public.ranks;
create policy ranks_write_admin on public.ranks
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists prizes_select_active on public.prizes;
create policy prizes_select_active on public.prizes
  for select to authenticated using (is_active or public.is_admin());

drop policy if exists prizes_write_admin on public.prizes;
create policy prizes_write_admin on public.prizes
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists materials_select_active on public.marketing_materials;
create policy materials_select_active on public.marketing_materials
  for select to authenticated using (is_active or public.is_admin());

drop policy if exists materials_write_admin on public.marketing_materials;
create policy materials_write_admin on public.marketing_materials
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- settings — todos leem (master switch da gamificação), admin escreve
-- -------------------------------------------------------------
drop policy if exists settings_select_all on public.settings;
create policy settings_select_all on public.settings
  for select to authenticated using (true);

drop policy if exists settings_update_admin on public.settings;
create policy settings_update_admin on public.settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- sales
-- O afiliado insere e lê as próprias vendas. Mudança de status
-- só pelas RPCs request_sale_cancellation / review_sale_cancellation.
-- -------------------------------------------------------------
drop policy if exists sales_select_self on public.sales;
create policy sales_select_self on public.sales
  for select to authenticated using (user_id = auth.uid());

drop policy if exists sales_select_downline on public.sales;
create policy sales_select_downline on public.sales
  for select to authenticated using (public.is_in_downline(auth.uid(), user_id));

drop policy if exists sales_select_admin on public.sales;
create policy sales_select_admin on public.sales
  for select to authenticated using (public.is_admin());

drop policy if exists sales_insert_self on public.sales;
create policy sales_insert_self on public.sales
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'ativa'
    and cancelled_at is null
    and reviewed_by is null
  );

drop policy if exists sales_all_admin on public.sales;
create policy sales_all_admin on public.sales
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- points_ledger — somente leitura para o dono; escrita só por trigger/RPC
-- -------------------------------------------------------------
drop policy if exists ledger_select_self on public.points_ledger;
create policy ledger_select_self on public.points_ledger
  for select to authenticated using (user_id = auth.uid());

drop policy if exists ledger_select_admin on public.points_ledger;
create policy ledger_select_admin on public.points_ledger
  for select to authenticated using (public.is_admin());

-- -------------------------------------------------------------
-- monthly_activity
-- -------------------------------------------------------------
drop policy if exists activity_select_self on public.monthly_activity;
create policy activity_select_self on public.monthly_activity
  for select to authenticated using (user_id = auth.uid());

drop policy if exists activity_select_downline on public.monthly_activity;
create policy activity_select_downline on public.monthly_activity
  for select to authenticated using (public.is_in_downline(auth.uid(), user_id));

drop policy if exists activity_all_admin on public.monthly_activity;
create policy activity_all_admin on public.monthly_activity
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- prize_requests — o afiliado vê os próprios pedidos; admin gerencia
-- -------------------------------------------------------------
drop policy if exists prize_requests_select_self on public.prize_requests;
create policy prize_requests_select_self on public.prize_requests
  for select to authenticated using (user_id = auth.uid());

drop policy if exists prize_requests_all_admin on public.prize_requests;
create policy prize_requests_all_admin on public.prize_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- Provisionamento de perfil no signup
-- sponsor vem do metadata (?ref=username no link de indicação)
-- =============================================================
create or replace function public.fn_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sponsor  uuid;
  v_username text;
begin
  v_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  ));
  v_username := regexp_replace(v_username, '[^a-z0-9._-]', '', 'g');

  if length(v_username) < 3 then
    v_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  -- colisão de username: sufixa com fragmento do uuid
  if exists (select 1 from public.users where username = v_username) then
    v_username := v_username || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  select id into v_sponsor
  from public.users
  where username = lower(new.raw_user_meta_data ->> 'sponsor_username');

  insert into public.users (id, sponsor_id, username, full_name, email)
  values (
    new.id,
    v_sponsor,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', v_username),
    new.email
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_auth_user();

-- =============================================================
-- Grants — as RPCs carregam a lógica privilegiada
-- =============================================================
grant usage on schema public to authenticated, anon;
grant select on public.ranks, public.settings, public.prizes,
                public.marketing_materials to authenticated;
grant select, insert on public.sales to authenticated;
grant select on public.points_ledger, public.monthly_activity, public.prize_requests to authenticated;
grant select, update on public.users to authenticated;
-- o admin gerencia catálogo e configuração pela UI; o RLS filtra quem é admin
grant insert, update, delete on public.prizes, public.marketing_materials, public.ranks to authenticated;
grant update on public.settings to authenticated;
grant update, delete on public.sales to authenticated;
grant insert, update, delete on public.prize_requests to authenticated;

grant execute on function public.my_sponsor_id()                           to authenticated;
grant execute on function public.is_admin()                                to authenticated;
grant execute on function public.is_in_downline(uuid, uuid)                to authenticated;
grant execute on function public.get_my_dashboard()                        to authenticated;
grant execute on function public.get_full_downline(uuid)                   to authenticated;
grant execute on function public.get_compressed_downline(uuid, int)        to authenticated;
grant execute on function public.request_sale_cancellation(uuid, text)     to authenticated;
grant execute on function public.request_prize(uuid)                       to authenticated;
grant execute on function public.review_sale_cancellation(uuid, boolean)   to authenticated;
grant execute on function public.fn_close_month(date)                      to authenticated;

-- estas nunca devem ser chamadas direto pelo cliente
revoke execute on function public.fn_distribute_points(uuid, public.points_origin, int, uuid, boolean, text) from authenticated, anon;
revoke execute on function public.get_compressed_upline(uuid, int) from anon;
