-- =============================================================
-- 009 — Código do afiliado gerado pelo sistema
--
-- Pedir o "nome de usuário" no cadastro era uma armadilha: o campo só
-- aceita minúsculas sem acento, então digitar o próprio nome ("Weverton",
-- "José Silva") era recusado antes de qualquer coisa acontecer.
--
-- Agora o código sai do primeiro nome + um sufixo numérico, ex.:
-- "Weverton Miranda" -> weverton1274. É só identificação visual e endereço
-- de link; quem manda na rede é o id.
-- =============================================================

-- Remove acentos e tudo que a constraint de username não aceita.
-- Feito com translate para não depender da extensão unaccent.
create or replace function public.fn_slugify_name(p_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           translate(
             lower(btrim(coalesce(p_text, ''))),
             'áàâãäéèêëíìîïóòôõöúùûüçñ',
             'aaaaaeeeeiiiiooooouuuucn'
           ),
           '[^a-z0-9]', '', 'g'
         )
$$;

-- Gera um código livre. Tenta o primeiro nome puro e, se já existir,
-- acrescenta sufixo numérico até achar um vago.
create or replace function public.fn_generate_username(
  p_full_name text,
  p_email     text default null
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_base      text;
  v_candidate text;
  v_try       int := 0;
begin
  -- primeiro nome
  v_base := public.fn_slugify_name(split_part(btrim(coalesce(p_full_name, '')), ' ', 1));

  -- Só descarta o nome se ele não sobrou nada utilizável. Um nome curto como
  -- "Zé" continua sendo a base ("ze1274"): trocá-lo por um genérico apagaria
  -- a identidade da pessoa no link.
  if length(v_base) < 2 then
    v_base := public.fn_slugify_name(split_part(coalesce(p_email, ''), '@', 1));
  end if;

  if length(v_base) < 2 then
    v_base := 'membro';
  end if;

  -- deixa espaço para o sufixo dentro do limite de 30
  v_base := left(v_base, 20);

  -- O primeiro nome puro, se estiver livre, fica mais bonito no link — mas
  -- precisa dos 3 caracteres mínimos do username.
  if length(v_base) >= 3
     and not exists (select 1 from public.users where username = v_base) then
    return v_base;
  end if;

  loop
    v_try := v_try + 1;
    v_candidate := v_base || (1000 + floor(random() * 9000))::int::text;

    exit when not exists (select 1 from public.users where username = v_candidate);

    -- Improvável, mas não deixa o cadastro travar num laço infinito:
    -- depois de muitas colisões, usa um sufixo do próprio uuid.
    if v_try >= 20 then
      v_candidate := left(v_base, 14) || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  return v_candidate;
end;
$$;

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

  -- Cliente da loja: não entra na árvore de afiliados. Sem link, o pedido
  -- fica como venda da casa.
  if v_role = 'customer' then
    insert into public.customers (id, full_name, email, phone, referred_by)
    values (
      new.id,
      coalesce(v_full_name, split_part(new.email, '@', 1)),
      new.email,
      new.raw_user_meta_data ->> 'phone',
      v_sponsor
    );
    return new;
  end if;

  -- Um username vindo do metadata ainda é respeitado (o script de admin de
  -- teste usa isso), mas o cadastro pelo site não envia mais esse campo.
  v_username := public.fn_slugify_name(new.raw_user_meta_data ->> 'username');

  if length(v_username) < 3
     or exists (select 1 from public.users where username = v_username) then
    v_username := public.fn_generate_username(v_full_name, new.email);
  end if;

  select not exists (select 1 from public.users) into v_first;

  if v_sponsor is null and not v_first then
    v_sponsor := public.fn_pick_best_sponsor();
  end if;

  insert into public.users (id, sponsor_id, username, full_name, email, is_admin)
  values (
    new.id,
    v_sponsor,
    v_username,
    coalesce(v_full_name, v_username),
    new.email,
    v_first
  );

  return new;
end;
$$;
