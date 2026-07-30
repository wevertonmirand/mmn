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
-- users
-- -------------------------------------------------------------
create policy users_select_self on public.users
  for select to authenticated
  using (id = auth.uid());

create policy users_select_downline on public.users
  for select to authenticated
  using (public.is_in_downline(auth.uid(), id));

-- necessário para renderizar "meu patrocinador" (apenas o direto)
create policy users_select_own_sponsor on public.users
  for select to authenticated
  using (id = (select u.sponsor_id from public.users u where u.id = auth.uid()));

create policy users_select_admin on public.users
  for select to authenticated
  using (public.is_admin());

-- o afiliado edita apenas dados de perfil; nunca pontos, rank,
-- sponsor, flags de inatividade ou is_admin
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and sponsor_id              is not distinct from (select u.sponsor_id              from public.users u where u.id = auth.uid())
    and username                is not distinct from (select u.username                from public.users u where u.id = auth.uid())
    and lifetime_points         is not distinct from (select u.lifetime_points         from public.users u where u.id = auth.uid())
    and current_rank_id         is not distinct from (select u.current_rank_id         from public.users u where u.id = auth.uid())
    and is_inactive             is not distinct from (select u.is_inactive             from public.users u where u.id = auth.uid())
    and is_admin                is not distinct from (select u.is_admin                from public.users u where u.id = auth.uid())
    and inactive_streak         is not distinct from (select u.inactive_streak         from public.users u where u.id = auth.uid())
    and maintenance_fail_streak is not distinct from (select u.maintenance_fail_streak from public.users u where u.id = auth.uid())
  );

create policy users_all_admin on public.users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------------
-- ranks / prizes / marketing_materials — leitura pública autenticada
-- -------------------------------------------------------------
create policy ranks_select_all on public.ranks
  for select to authenticated using (true);

create policy ranks_write_admin on public.ranks
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy prizes_select_active on public.prizes
  for select to authenticated using (is_active or public.is_admin());

create policy prizes_write_admin on public.prizes
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy materials_select_active on public.marketing_materials
  for select to authenticated using (is_active or public.is_admin());

create policy materials_write_admin on public.marketing_materials
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- settings — todos leem (master switch da gamificação), admin escreve
-- -------------------------------------------------------------
create policy settings_select_all on public.settings
  for select to authenticated using (true);

create policy settings_update_admin on public.settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- sales
-- O afiliado insere e lê as próprias vendas. Mudança de status
-- só pelas RPCs request_sale_cancellation / review_sale_cancellation.
-- -------------------------------------------------------------
create policy sales_select_self on public.sales
  for select to authenticated using (user_id = auth.uid());

create policy sales_select_downline on public.sales
  for select to authenticated using (public.is_in_downline(auth.uid(), user_id));

create policy sales_select_admin on public.sales
  for select to authenticated using (public.is_admin());

create policy sales_insert_self on public.sales
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'ativa'
    and cancelled_at is null
    and reviewed_by is null
  );

create policy sales_all_admin on public.sales
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- points_ledger — somente leitura para o dono; escrita só por trigger/RPC
-- -------------------------------------------------------------
create policy ledger_select_self on public.points_ledger
  for select to authenticated using (user_id = auth.uid());

create policy ledger_select_admin on public.points_ledger
  for select to authenticated using (public.is_admin());

-- -------------------------------------------------------------
-- monthly_activity
-- -------------------------------------------------------------
create policy activity_select_self on public.monthly_activity
  for select to authenticated using (user_id = auth.uid());

create policy activity_select_downline on public.monthly_activity
  for select to authenticated using (public.is_in_downline(auth.uid(), user_id));

create policy activity_all_admin on public.monthly_activity
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- prize_requests — o afiliado vê os próprios pedidos; admin gerencia
-- -------------------------------------------------------------
create policy prize_requests_select_self on public.prize_requests
  for select to authenticated using (user_id = auth.uid());

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_auth_user();

-- =============================================================
-- Grants — as RPCs carregam a lógica privilegiada
-- =============================================================
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
