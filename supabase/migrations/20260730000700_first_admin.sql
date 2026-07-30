-- =============================================================
-- 007 — Bootstrap do primeiro admin e validação do link de indicação
--
-- Dois problemas de partida:
--
-- 1. O primeiro afiliado não tem quem o indique, e ninguém pode promovê-lo
--    a admin (a coluna `is_admin` é protegida por trigger). Sem isso o
--    projeto nasce travado, exigindo SQL manual.
--
-- 2. Um `?ref=` inexistente ou com erro de digitação era ignorado em
--    silêncio: o afiliado entrava na raiz da árvore, e o patrocinador
--    perdia a indicação sem ninguém perceber.
-- =============================================================

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
  v_username     text;
  v_role         text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'affiliate'));
  v_first        boolean;
begin
  if v_sponsor_name is not null then
    select id into v_sponsor from public.users where username = v_sponsor_name;

    -- Link inválido falha alto: melhor recusar o cadastro do que pendurar
    -- o afiliado na raiz e perder a indicação silenciosamente.
    if v_sponsor is null then
      raise exception 'Link de indicação inválido: o usuário @% não existe', v_sponsor_name
        using hint = 'Confira o link com quem te indicou, ou cadastre-se sem link.';
    end if;
  end if;

  -- cliente da loja: não entra na árvore de afiliados
  if v_role = 'customer' then
    insert into public.customers (id, full_name, email, phone, referred_by)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      new.email,
      new.raw_user_meta_data ->> 'phone',
      v_sponsor
    );
    return new;
  end if;

  v_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  ));
  v_username := regexp_replace(v_username, '[^a-z0-9._-]', '', 'g');

  if length(v_username) < 3 then
    v_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  if exists (select 1 from public.users where username = v_username) then
    v_username := v_username || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  -- O primeiro afiliado da rede vira admin: é quem está montando a operação,
  -- e não existe ninguém para promovê-lo.
  select not exists (select 1 from public.users) into v_first;

  insert into public.users (id, sponsor_id, username, full_name, email, is_admin)
  values (
    new.id,
    v_sponsor,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', v_username),
    new.email,
    v_first
  );

  return new;
end;
$$;

-- -------------------------------------------------------------
-- Promover alguém a admin sem abrir o SQL Editor.
-- Só um admin existente pode chamar; a coluna segue protegida
-- contra escrita direta pelo app.
-- -------------------------------------------------------------
create or replace function public.set_admin(
  p_username text,
  p_is_admin boolean default true
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar permissões';
  end if;

  update public.users
     set is_admin = p_is_admin
   where username = lower(btrim(p_username))
  returning * into v_user;

  if v_user.id is null then
    raise exception 'Usuário @% não encontrado', p_username;
  end if;

  -- Deixar a operação sem nenhum admin tornaria o painel inacessível.
  if not p_is_admin and not exists (select 1 from public.users where is_admin) then
    raise exception 'Esta é a única conta administradora — promova outra antes de remover';
  end if;

  return v_user;
end;
$$;

grant execute on function public.set_admin(text, boolean) to authenticated;
