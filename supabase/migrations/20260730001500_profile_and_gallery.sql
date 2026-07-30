-- =============================================================
-- 015 — Perfil do afiliado, WhatsApp obrigatório e galeria de produtos
-- =============================================================

-- -------------------------------------------------------------
-- Até 3 fotos por produto
-- `image_url` continua sendo a capa, mantida em sincronia com a
-- primeira posição para não quebrar o que já lê essa coluna.
-- -------------------------------------------------------------
alter table public.products
  add column if not exists images text[] not null default '{}';

do $$ begin
  alter table public.products
    add constraint products_images_max3 check (coalesce(array_length(images, 1), 0) <= 3);
exception when duplicate_object or duplicate_table then null; end $$;

-- fotos já cadastradas viram a primeira posição da galeria
update public.products
   set images = array[image_url]
 where image_url is not null
   and coalesce(array_length(images, 1), 0) = 0;

create or replace function public.fn_products_sync_cover()
returns trigger
language plpgsql
as $$
begin
  -- descarta posições vazias para a capa nunca cair num buraco do array
  new.images := array(
    select trim(v) from unnest(coalesce(new.images, '{}')) v
    where trim(coalesce(v, '')) <> ''
  );
  new.image_url := nullif(new.images[1], '');
  return new;
end;
$$;

drop trigger if exists products_sync_cover on public.products;
create trigger products_sync_cover
  before insert or update on public.products
  for each row execute function public.fn_products_sync_cover();

-- -------------------------------------------------------------
-- O nome de indicação é escolhido UMA vez
-- Depois disso ele já foi divulgado em links; trocar quebraria o
-- que os afiliados espalharam.
-- -------------------------------------------------------------
alter table public.users
  add column if not exists username_changed_at timestamptz;

create or replace function public.change_my_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_changed  timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;

  select username_changed_at into v_changed from public.users where id = auth.uid();

  if v_changed is not null then
    raise exception 'Seu link de indicação já foi definido e não pode ser alterado novamente'
      using hint = 'Fale com o suporte se precisar de uma exceção.';
  end if;

  if v_username !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'Use de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado';
  end if;

  if exists (
    select 1 from public.users
    where lower(username) = v_username and id <> auth.uid()
  ) then
    raise exception 'Este nome de indicação já está em uso';
  end if;

  update public.users
     set username = v_username, username_changed_at = now()
   where id = auth.uid()
     and not is_inactive;

  if not found then
    raise exception 'Afiliado não encontrado ou inativo';
  end if;

  return v_username;
exception
  when unique_violation then
    raise exception 'Este nome de indicação acabou de ser escolhido por outra pessoa';
end;
$$;

grant execute on function public.change_my_username(text) to authenticated;

-- -------------------------------------------------------------
-- Sugestões de melhoria enviadas pelos afiliados
-- -------------------------------------------------------------
do $$ begin
  create type public.suggestion_status as enum ('nova', 'analisando', 'concluida', 'recusada');
exception when duplicate_object then null; end $$;

create table if not exists public.app_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  message    text not null check (length(btrim(message)) between 10 and 2000),
  status     public.suggestion_status not null default 'nova',
  admin_note text,
  created_at timestamptz not null default now()
);

create index if not exists app_suggestions_status_idx
  on public.app_suggestions (status, created_at desc);

alter table public.app_suggestions enable row level security;

drop policy if exists suggestions_insert_own on public.app_suggestions;
create policy suggestions_insert_own on public.app_suggestions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists suggestions_select_own on public.app_suggestions;
create policy suggestions_select_own on public.app_suggestions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists suggestions_admin_all on public.app_suggestions;
create policy suggestions_admin_all on public.app_suggestions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.app_suggestions to authenticated;
grant update, delete on public.app_suggestions to authenticated;

-- -------------------------------------------------------------
-- WhatsApp no cadastro do afiliado
--
-- A obrigatoriedade fica no formulário, não aqui. Um `raise` no trigger
-- derrubaria todo caminho legítimo que não passa pela tela: o "Add user"
-- do painel do Supabase, o script de admin de teste e qualquer seed —
-- deixando o projeto sem como criar o primeiro usuário.
--
-- O trigger normaliza e guarda o telefone quando ele vem no metadata.
-- -------------------------------------------------------------
create or replace function public.fn_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sponsor      uuid;
  v_sponsor_name text := nullif(btrim(lower(
                           coalesce(new.raw_user_meta_data ->> 'sponsor_username', ''))), '');
  v_full_name    text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_phone        text := nullif(regexp_replace(
                           coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), '');
  v_username     text;
  v_role         text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'affiliate'));
  v_first        boolean;
begin
  if v_sponsor_name is not null then
    select id into v_sponsor from public.users where username = v_sponsor_name;

    if v_sponsor is null then
      raise exception 'Link de indicação inválido: o usuário @% não existe', v_sponsor_name
        using hint = 'Confira o link com quem te indicou, ou cadastre-se sem link.';
    end if;
  end if;

  if v_role = 'customer' then
    insert into public.customers (id, full_name, email, phone, referred_by)
    values (
      new.id,
      coalesce(v_full_name, split_part(new.email, '@', 1)),
      new.email,
      v_phone,
      v_sponsor
    );
    return new;
  end if;

  v_username := public.fn_slugify_name(new.raw_user_meta_data ->> 'username');

  if length(v_username) < 3
     or exists (select 1 from public.users where username = v_username) then
    v_username := public.fn_generate_username(v_full_name, new.email);
  end if;

  select not exists (select 1 from public.users) into v_first;

  if v_sponsor is null and not v_first then
    v_sponsor := public.fn_pick_best_sponsor();
  end if;

  insert into public.users (id, sponsor_id, username, full_name, email, phone, is_admin)
  values (
    new.id,
    v_sponsor,
    v_username,
    coalesce(v_full_name, v_username),
    new.email,
    v_phone,
    v_first
  );

  return new;
end;
$$;

notify pgrst, 'reload schema';
