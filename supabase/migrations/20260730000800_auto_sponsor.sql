-- =============================================================
-- 008 — Atribuição automática de patrocinador
--
-- Quem chega sem link de indicação não deve ficar na raiz da árvore:
-- ninguém o acompanha e a rede perde a profundidade. Passa a ser
-- direcionado ao afiliado "mais capacitado" para dar suporte.
--
-- A tela promete "a pessoa mais capacitada", então o candidato precisa ser
-- alguém que já produziu — ou o admin, que numa operação nova é o único.
-- Só entre esses é que a carga é distribuída:
--
--   1. ativo e (com pontuação > 0 ou admin)  -> capacitado de fato
--   2. menos indicados diretos               -> distribui o acompanhamento
--   3. maior pontuação acumulada             -> entre os livres, quem produz mais
--   4. mais antigo na casa                   -> desempate estável
--
-- Duas armadilhas que a ordem evita:
--
-- Pontuação como primeiro critério criaria retroalimentação: cada indicação
-- recebida rende pontos de recrutamento (3x), o que manteria a mesma pessoa
-- no topo e concentraria nela todos os cadastros sem link.
--
-- Só "menos diretos", por outro lado, entregaria sempre ao recém-chegado com
-- zero diretos — o menos capacitado de todos, contradizendo o que a tela diz.
-- =============================================================

-- VOLATILE de propósito: STABLE congelaria a contagem de diretos no snapshot
-- de início da instrução, então vários cadastros na mesma transação cairiam
-- todos no mesmo patrocinador.
create or replace function public.fn_pick_best_sponsor()
returns uuid
language sql
volatile
security definer
set search_path = public
as $$
  with candidatos as (
    select u.id, u.lifetime_points, u.joined_at,
           (select count(*) from public.users d where d.sponsor_id = u.id) as diretos
    from public.users u
    where not u.is_inactive
      and (u.lifetime_points > 0 or u.is_admin)
  )
  select id from (
    select id, diretos, lifetime_points, joined_at from candidatos
    union all
    -- Rede sem ninguém produzindo ainda: cai para qualquer afiliado ativo,
    -- para nunca devolver nulo e deixar o novato órfão na raiz.
    select u.id,
           (select count(*) from public.users d where d.sponsor_id = u.id),
           u.lifetime_points, u.joined_at
    from public.users u
    where not u.is_inactive and not exists (select 1 from candidatos)
  ) t
  order by diretos asc, lifetime_points desc, joined_at asc
  limit 1
$$;

comment on function public.fn_pick_best_sponsor() is
  'Afiliado ativo mais indicado para receber quem se cadastra sem link.';

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

  -- Cliente da loja: não entra na árvore de afiliados. Sem link, o pedido
  -- fica como venda da casa — atribuir a um afiliado qualquer daria
  -- comissão de uma venda que ele não fez.
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

  -- Sem link, direciona ao afiliado mais capacitado. No primeiro cadastro
  -- não há ninguém, então ele fica sendo a raiz.
  if v_sponsor is null and not v_first then
    v_sponsor := public.fn_pick_best_sponsor();
  end if;

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
