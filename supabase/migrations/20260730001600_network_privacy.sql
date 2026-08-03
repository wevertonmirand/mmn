-- =============================================================
-- 016 — Privacidade da rede e navegação em árvore
--
-- Antes desta migração, a política `users_select_downline` deixava
-- qualquer afiliado ler a linha INTEIRA de toda a sua downline, em
-- qualquer profundidade (`is_in_downline` percorre até 100 níveis).
-- Como o grant é da tabela toda (`grant select on public.users`) e o
-- PostgREST expõe `public.users`, um `GET /rest/v1/users?select=*`
-- devolvia telefone, e-mail, pontos e estrutura de todo mundo abaixo.
-- A tela nunca mostrou esses dados, mas isso era escolha de UI — não
-- uma fronteira aplicada.
--
-- A regra de produto é:
--   * admin  — vê a rede inteira, sem limite de profundidade;
--   * afiliado — navega até o 5º nível; no nível 1 vê nome, WhatsApp,
--     pontuação, situação e o tamanho da rede daquela pessoa; do 2º ao
--     5º vê SOMENTE o nome.
--
-- "Nível 1 sim, 2 a 5 não" não se expressa como grant de coluna (grant
-- é independente de linha). E revogar o SELECT da tabela quebraria as
-- views administrativas, que são `security_invoker = true`, além das
-- leituras que cada usuário faz da própria linha.
--
-- Então: restringimos as LINHAS (o afiliado passa a enxergar apenas a
-- própria e a do patrocinador direto) e servimos a rede exclusivamente
-- por RPCs SECURITY DEFINER que redigem os campos no próprio SQL.
-- =============================================================

-- -------------------------------------------------------------
-- Helper: profundidade real de p_user dentro da rede de p_ancestor.
-- Sobe a árvore a partir de p_user — O(profundidade), não O(rede),
-- igual ao que `is_in_downline` já fazia. Devolve null quando não é
-- descendente (inclusive para crossline e para o próprio usuário).
-- -------------------------------------------------------------
create or replace function public.downline_depth(p_ancestor uuid, p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  with recursive up as (
    select u.id, u.sponsor_id, 0 as depth
    from public.users u
    where u.id = p_user
    union all
    select p.id, p.sponsor_id, up.depth + 1
    from public.users p
    join up on p.id = up.sponsor_id
    where up.depth < 100 -- trava de segurança
  )
  select min(up.depth)
  from up
  where up.id = p_ancestor
    and up.depth > 0
    and p_ancestor is not null
    and p_ancestor is distinct from p_user;
$$;

-- `is_in_downline` passa a derivar do helper: mesma assinatura, mesma
-- tabela-verdade, uma única implementação de travessia. Continua SEM
-- limite de nível de propósito — ela ainda governa políticas de vendas
-- e de atividade e o guarda de `get_full_downline`. O corte de 5 níveis
-- é regra de produto e vive só nas RPCs abaixo.
create or replace function public.is_in_downline(p_ancestor uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.downline_depth(p_ancestor, p_user) is not null;
$$;

-- -------------------------------------------------------------
-- Helper: tamanho da rede de vários nós de uma vez.
--
-- Um CTE recursivo único, semeado com TODOS os nós da página e agrupado
-- por semente. Fazer isso por linha seria uma recursão N+1 dentro do
-- SQL. Usa o índice `users_sponsor_id_idx`.
-- -------------------------------------------------------------
create or replace function public.fn_downline_counts(p_roots uuid[], p_levels int)
returns table (root uuid, total int)
language sql
stable
security definer
set search_path = public
as $$
  with recursive sub as (
    select r.id as seed, c.id as node, 1 as lvl
    from unnest(coalesce(p_roots, '{}'::uuid[])) as r(id)
    join public.users c on c.sponsor_id = r.id
    union all
    select s.seed, u.id, s.lvl + 1
    from sub s
    join public.users u on u.sponsor_id = s.node
    where s.lvl < p_levels
  )
  select s.seed, count(*)::int
  from sub s
  group by s.seed;
$$;

-- -------------------------------------------------------------
-- Navegação da rede do afiliado (um clique = um nível)
--
-- Devolve os filhos DIRETOS de p_parent já redigidos. Fora da downline
-- ou além do 5º nível, devolve conjunto vazio em vez de erro — é a
-- convenção que o resto do projeto usa para crossline.
-- -------------------------------------------------------------
drop function if exists public.get_my_network_children(uuid, int, int);
create function public.get_my_network_children(
  p_parent uuid default null,
  p_limit  int  default 200,
  p_offset int  default 0
)
returns table (
  user_id         uuid,
  full_name       text,
  username        text,
  phone           text,
  depth           int,
  is_inactive     boolean,
  lifetime_points int,
  rank_name       text,
  joined_at       timestamptz,
  direct_count    int,
  network_count   int,
  can_expand      boolean,
  total_children  int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me          uuid := auth.uid();
  v_parent      uuid;
  v_depth       int;
  v_child_depth int;
  v_limit       int := least(greatest(coalesce(p_limit, 200), 1), 500);
  v_offset      int := greatest(coalesce(p_offset, 0), 0);
begin
  if v_me is null then
    return;
  end if;

  v_parent := coalesce(p_parent, v_me);

  -- distância do afiliado até o nó pedido (0 = ele mesmo)
  v_depth := case
               when v_parent = v_me then 0
               else public.downline_depth(v_me, v_parent)
             end;

  -- null  => crossline (não é da rede dele)
  -- >= 5  => os filhos cairiam no 6º nível
  -- O guarda é sobre a profundidade do PAI: filhos de um nó de nível 4
  -- são nível 5 e são permitidos.
  if v_depth is null or v_depth >= 5 then
    return;
  end if;

  v_child_depth := v_depth + 1;

  return query
  with page as (
    select c.*, count(*) over ()::int as total
    from public.users c
    where c.sponsor_id = v_parent
    order by c.full_name, c.username
    limit v_limit offset v_offset
  ),
  counts as (
    -- só o nível 1 mostra tamanho de rede; nos demais nem calculamos
    select fc.root, fc.total
    from public.fn_downline_counts(
           case when v_child_depth = 1
                then (select array_agg(p.id) from page p)
                else '{}'::uuid[] end,
           5
         ) fc
  )
  select
    p.id,
    p.full_name,                                                    -- sempre visível
    case when v_child_depth = 1 then p.username end,
    case when v_child_depth = 1 then p.phone end,
    v_child_depth,
    case when v_child_depth = 1 then p.is_inactive end,
    case when v_child_depth = 1 then p.lifetime_points end,
    case when v_child_depth = 1 then r.name end,
    case when v_child_depth = 1 then p.joined_at end,
    case when v_child_depth = 1
         then (select count(*)::int from public.users g where g.sponsor_id = p.id) end,
    case when v_child_depth = 1 then coalesce(ct.total, 0) end,
    -- no 5º nível devolve false SEM avaliar o exists: a existência de um
    -- 6º nível nunca é revelada, nem por um chevron aceso.
    case when v_child_depth < 5
         then exists (select 1 from public.users g where g.sponsor_id = p.id)
         else false end,
    p.total
  from page p
  left join public.ranks r on r.id = p.current_rank_id
  left join counts ct on ct.root = p.id
  order by p.full_name, p.username;
end;
$$;

-- -------------------------------------------------------------
-- Navegação da rede pelo admin — sem redação e sem limite de nível.
--
-- Levanta exceção em vez de devolver vazio: /admin já é protegido por
-- notFound(), então aqui não há o que esconder — um erro claro ajuda.
-- p_parent null devolve as raízes (o admin e qualquer órfão).
-- -------------------------------------------------------------
drop function if exists public.get_admin_network_children(uuid, int, int);
create function public.get_admin_network_children(
  p_parent uuid default null,
  p_limit  int  default 200,
  p_offset int  default 0
)
returns table (
  user_id         uuid,
  full_name       text,
  username        text,
  phone           text,
  depth           int,
  is_inactive     boolean,
  lifetime_points int,
  rank_name       text,
  joined_at       timestamptz,
  direct_count    int,
  network_count   int,
  can_expand      boolean,
  total_children  int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit  int := least(greatest(coalesce(p_limit, 200), 1), 500);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem navegar a rede completa';
  end if;

  return query
  with page as (
    select c.*, count(*) over ()::int as total
    from public.users c
    where (p_parent is null and c.sponsor_id is null)
       or (p_parent is not null and c.sponsor_id = p_parent)
    order by c.full_name, c.username
    limit v_limit offset v_offset
  ),
  counts as (
    select fc.root, fc.total
    from public.fn_downline_counts((select array_agg(p.id) from page p), 5) fc
  )
  select
    p.id,
    p.full_name,
    p.username,
    p.phone,
    null::int,                    -- o admin não tem "nível"; a UI usa o aninhamento
    p.is_inactive,
    p.lifetime_points,
    r.name,
    p.joined_at,
    (select count(*)::int from public.users g where g.sponsor_id = p.id),
    coalesce(ct.total, 0),
    exists (select 1 from public.users g where g.sponsor_id = p.id),
    p.total
  from page p
  left join public.ranks r on r.id = p.current_rank_id
  left join counts ct on ct.root = p.id
  order by p.full_name, p.username;
end;
$$;

-- -------------------------------------------------------------
-- Busca do admin: acha alguém em qualquer profundidade e devolve o
-- caminho até a raiz, para a UI abrir a árvore já expandida nele.
--
-- `path_ids` vem da raiz para baixo e inclui o próprio encontrado.
-- -------------------------------------------------------------
drop function if exists public.search_network(text, int);
create function public.search_network(p_term text, p_limit int default 20)
returns table (
  user_id     uuid,
  full_name   text,
  username    text,
  phone       text,
  is_inactive boolean,
  path_ids    uuid[],
  path_names  text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_term   text := btrim(coalesce(p_term, ''));
  v_digits text := regexp_replace(coalesce(p_term, ''), '\D', '', 'g');
  v_limit  int  := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem buscar na rede';
  end if;

  if length(v_term) < 2 then
    return;
  end if;

  return query
  with hits as (
    select u.id, u.full_name, u.username, u.phone, u.is_inactive
    from public.users u
    where u.full_name ilike '%' || v_term || '%'
       or u.username  ilike '%' || v_term || '%'
       or (v_digits <> '' and regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') like '%' || v_digits || '%')
    order by u.full_name
    limit v_limit
  ),
  paths as (
    -- sobe de cada acerto até a raiz, acumulando o caminho
    with recursive up as (
      select h.id as hit, u.id as node, u.sponsor_id, u.full_name, 0 as step
      from hits h
      join public.users u on u.id = h.id
      union all
      select p.hit, s.id, s.sponsor_id, s.full_name, p.step + 1
      from up p
      join public.users s on s.id = p.sponsor_id
      where p.step < 100 -- trava de segurança
    )
    select up.hit,
           array_agg(up.node      order by up.step desc) as ids,
           array_agg(up.full_name order by up.step desc) as names
    from up
    group by up.hit
  )
  select h.id, h.full_name, h.username, h.phone, h.is_inactive, p.ids, p.names
  from hits h
  join paths p on p.hit = h.id
  order by h.full_name;
end;
$$;

-- -------------------------------------------------------------
-- Políticas: a rede sai da tabela e passa a viver nas RPCs
-- -------------------------------------------------------------

-- ESTA é a mudança que fecha o vazamento. Sobram `users_select_self`,
-- `users_select_own_sponsor` (o patrocinador direto é contato legítimo,
-- espelho do que o nível 1 enxerga) e `users_select_admin`. Nenhuma tela
-- quebra: as quatro leituras diretas de `public.users` no app
-- (`app/page.tsx`, os dois layouts e `/perfil`) leem a PRÓPRIA linha.
drop policy if exists users_select_downline on public.users;

-- Mesmo vazamento, outra tabela: `sales` carrega `customer_name` — PII
-- de terceiro — e a política deixava ler a downline inteira, sem limite
-- de profundidade. Nenhuma tela lê isso (/vendas lê as próprias vendas).
drop policy if exists sales_select_downline on public.sales;
create policy sales_select_downline on public.sales
  for select to authenticated
  using (public.downline_depth(auth.uid(), user_id) between 1 and 5);

drop policy if exists activity_select_downline on public.monthly_activity;
create policy activity_select_downline on public.monthly_activity
  for select to authenticated
  using (public.downline_depth(auth.uid(), user_id) between 1 and 5);

-- -------------------------------------------------------------
-- Grants
-- -------------------------------------------------------------

-- `downline_depth` é usada em política: expressão de RLS roda com os
-- privilégios de quem consulta, então sem este grant toda consulta a
-- `sales`/`monthly_activity` morreria com "permission denied for function".
grant execute on function public.downline_depth(uuid, uuid)                to authenticated;
grant execute on function public.get_my_network_children(uuid, int, int)   to authenticated;
grant execute on function public.get_admin_network_children(uuid, int, int) to authenticated;
grant execute on function public.search_network(text, int)                 to authenticated;

-- -------------------------------------------------------------
-- ATENÇÃO: `revoke ... from authenticated` NÃO fecha uma função.
--
-- No Postgres, toda função nasce com EXECUTE concedido a PUBLIC. Tirar
-- o privilégio de `authenticated` não remove o de PUBLIC, e `authenticated`
-- continua executando por herança. Isso foi verificado no banco: o ACL
-- dessas funções era `=X/postgres` (o `=` antes da barra é PUBLIC), e um
-- afiliado conseguia mesmo chamar `fn_distribute_points` para creditar
-- pontos a si próprio.
--
-- Todos os `revoke` já existentes no projeto (rls.sql:302-303,
-- store.sql:686, order_dispatch.sql:249-250) eram no-op pelo mesmo
-- motivo. Fechamos aqui de uma vez, revogando de PUBLIC.
--
-- Nada disso quebra pontos, comissão ou fechamento: todos os chamadores
-- internos (`fn_distribute_points`, `fn_recruitment_award_points`,
-- `close_order`, `fn_close_internal_order`, `get_my_dashboard`) são
-- SECURITY DEFINER e executam como o owner, que mantém o EXECUTE
-- explícito.
-- -------------------------------------------------------------

-- Motor de pontos: era chamável direto pelo afiliado. Buraco de fraude.
revoke execute on function public.fn_distribute_points(uuid, public.points_origin, int, uuid, boolean, text) from public, authenticated, anon;
revoke execute on function public.fn_reverse_sale_points(uuid)      from public, authenticated, anon;

-- Fechamento de pedido por dentro: só via `close_order`, que valida admin.
revoke execute on function public.fn_close_internal_order(public.orders, text) from public, authenticated, anon;
revoke execute on function public.fn_close_customer_order(public.orders, text) from public, authenticated, anon;

-- Helper interno: só as RPCs definer acima chamam.
revoke execute on function public.fn_downline_counts(uuid[], int) from public, authenticated, anon;

-- Leitores de árvore sem redação saem do alcance do navegador.
-- `get_compressed_downline` era o pior caso: SECURITY DEFINER, concedida
-- a `authenticated` e sem NENHUMA verificação de quem chamou — bastava
-- passar um p_root arbitrário para ler a subárvore de outra pessoa.
revoke execute on function public.get_compressed_downline(uuid, int) from public, authenticated, anon;
revoke execute on function public.get_compressed_upline(uuid, int)   from public, authenticated, anon;
revoke execute on function public.get_full_downline(uuid)            from public, authenticated, anon;

-- -------------------------------------------------------------
-- Dashboard: "Rede total" passa a contar 5 níveis
--
-- O número vinha de `get_full_downline`, que é ilimitada. Como o
-- afiliado agora enxerga (e monetiza) 5 níveis, mostrar um total maior
-- que isso seria um número que ele não consegue nem navegar nem receber.
-- -------------------------------------------------------------
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
    where d.depth <= 5
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

notify pgrst, 'reload schema';
