-- =============================================================
-- 001 — Schema base
-- Plataforma de afiliados (Unilevel, 5 níveis, compressão dinâmica)
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------
do $$ begin
  create type public.points_origin as enum ('sale', 'recruitment', 'adjustment');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.sale_status as enum ('ativa', 'pendente_cancelamento', 'cancelada');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.prize_status as enum ('solicitado', 'entregue', 'recusado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.material_type as enum ('banner', 'video', 'documento');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------
-- Ranks (graduações)
-- rank_order define a escada: rebaixamento vai para rank_order - 1
-- -------------------------------------------------------------
create table if not exists public.ranks (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  rank_order         int  not null unique check (rank_order >= 0),
  required_points    int  not null default 0 check (required_points >= 0),
  maintenance_points int  not null default 0 check (maintenance_points >= 0),
  description        text,
  created_at         timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Usuários / afiliados
-- sponsor_id monta a rede unilevel (lateralidade infinita)
-- -------------------------------------------------------------
create table if not exists public.users (
  id                      uuid primary key references auth.users (id) on delete cascade,
  sponsor_id              uuid references public.users (id) on delete set null,
  username                text not null unique
                          check (username ~ '^[a-z0-9._-]{3,30}$'),
  full_name               text not null,
  email                   text,
  phone                   text,
  avatar_url              text,
  lifetime_points         int  not null default 0,
  current_rank_id         uuid references public.ranks (id) on delete set null,
  is_inactive             boolean not null default false,
  is_admin                boolean not null default false,
  -- contadores de ciclo mensal
  inactive_streak         int not null default 0 check (inactive_streak >= 0),
  maintenance_fail_streak int not null default 0 check (maintenance_fail_streak >= 0),
  joined_at               timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint users_no_self_sponsor check (sponsor_id is null or sponsor_id <> id)
);

create index if not exists users_sponsor_id_idx  on public.users (sponsor_id);
create index if not exists users_username_idx    on public.users (lower(username));
create index if not exists users_is_inactive_idx on public.users (is_inactive) where is_inactive;

-- -------------------------------------------------------------
-- Configuração global (linha única, id = true)
-- -------------------------------------------------------------
create table if not exists public.settings (
  id                     boolean primary key default true check (id),
  min_products_monthly   int  not null default 2 check (min_products_monthly >= 0),
  max_network_levels     int  not null default 5 check (max_network_levels between 1 and 20),
  sale_multiplier        int  not null default 1 check (sale_multiplier > 0),
  recruitment_multiplier int  not null default 3 check (recruitment_multiplier > 0),
  gamification_enabled   boolean not null default true,
  theme                  text not null default 'gold' check (theme in ('gold', 'slate', 'emerald')),
  updated_at             timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Vendas (CRM manual do afiliado)
-- Cancelamento é sempre em duas etapas: pedido -> aprovação do admin
-- -------------------------------------------------------------
create table if not exists public.sales (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  product_name        text not null check (length(btrim(product_name)) > 0),
  quantity            int  not null default 1 check (quantity > 0),
  base_points         int  not null check (base_points >= 0),
  customer_name       text,
  notes               text,
  status              public.sale_status not null default 'ativa',
  cancel_reason       text,
  cancel_requested_at timestamptz,
  cancelled_at        timestamptz,
  reviewed_by         uuid references public.users (id) on delete set null,
  sold_at             timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists sales_user_id_idx on public.sales (user_id, sold_at desc);
create index if not exists sales_status_idx  on public.sales (status) where status = 'pendente_cancelamento';

-- -------------------------------------------------------------
-- Motor de pontuação (ledger imutável — estornos entram como linha negativa)
-- level = 0 é o próprio gerador do evento; 1..5 é a upline comprimida
-- -------------------------------------------------------------
create table if not exists public.points_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade, -- quem recebe
  source_user_id uuid not null references public.users (id) on delete cascade, -- quem gerou
  origin         public.points_origin not null,
  base_points    int not null,
  multiplier     int not null check (multiplier > 0),
  points         int not null generated always as (base_points * multiplier) stored,
  level          int not null check (level between 0 and 20),
  sale_id        uuid references public.sales (id) on delete set null,
  is_reversal    boolean not null default false,
  reverses_id    uuid references public.points_ledger (id) on delete set null,
  description    text,
  created_at     timestamptz not null default now()
);

create index if not exists points_ledger_user_idx   on public.points_ledger (user_id, created_at desc);
create index if not exists points_ledger_sale_idx   on public.points_ledger (sale_id);
create index if not exists points_ledger_source_idx on public.points_ledger (source_user_id);
-- garante um único estorno por lançamento
create unique index if not exists points_ledger_reverses_uniq
  on public.points_ledger (reverses_id) where reverses_id is not null;

-- -------------------------------------------------------------
-- Fechamento mensal (ativação + manutenção de graduação)
-- period = primeiro dia do mês de referência
-- -------------------------------------------------------------
create table if not exists public.monthly_activity (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  period          date not null,
  products_count  int  not null default 0,
  personal_points int  not null default 0,
  network_points  int  not null default 0,
  min_required    int  not null default 0,
  is_active       boolean not null default false,
  rank_id         uuid references public.ranks (id) on delete set null,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  constraint monthly_activity_period_start check (period = date_trunc('month', period)::date),
  constraint monthly_activity_uniq unique (user_id, period)
);

create index if not exists monthly_activity_period_idx on public.monthly_activity (period desc);

-- -------------------------------------------------------------
-- Prêmios e solicitações
-- -------------------------------------------------------------
create table if not exists public.prizes (
  id              uuid primary key default gen_random_uuid(),
  -- único para o seed poder usar ON CONFLICT (name) e não duplicar,
  -- e para o CRUD do admin não criar dois prêmios com o mesmo nome
  name            text not null unique,
  description     text,
  required_points int  not null check (required_points > 0),
  image_url       text,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.prize_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  prize_id       uuid not null references public.prizes (id) on delete restrict,
  points_at_time int  not null,
  status         public.prize_status not null default 'solicitado',
  admin_notes    text,
  reviewed_by    uuid references public.users (id) on delete set null,
  requested_at   timestamptz not null default now(),
  delivered_at   timestamptz,
  -- um pedido em aberto por prêmio/usuário
  constraint prize_requests_uniq unique (user_id, prize_id)
);

create index if not exists prize_requests_status_idx on public.prize_requests (status, requested_at desc);

-- -------------------------------------------------------------
-- Materiais de marketing
-- width/height são guardados para o front reservar o aspect-ratio
-- original sem precisar de crop
-- -------------------------------------------------------------
create table if not exists public.marketing_materials (
  id          uuid primary key default gen_random_uuid(),
  title       text not null unique,
  description text,
  type        public.material_type not null default 'banner',
  file_url    text not null,
  file_size   bigint,
  width       int,
  height      int,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- updated_at automático
-- -------------------------------------------------------------
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.fn_touch_updated_at();

drop trigger if exists prizes_touch_updated_at on public.prizes;
create trigger prizes_touch_updated_at
  before update on public.prizes
  for each row execute function public.fn_touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.fn_touch_updated_at();

-- -------------------------------------------------------------
-- Bancos criados antes destas constraints não as ganham pelo
-- `create table if not exists` acima, então aplicamos à parte.
-- Sem elas o ON CONFLICT do seed não tem alvo e duplica as linhas.
-- -------------------------------------------------------------
do $$ begin
  alter table public.prizes add constraint prizes_name_key unique (name);
exception when duplicate_table or duplicate_object then null; end $$;

do $$ begin
  alter table public.marketing_materials
    add constraint marketing_materials_title_key unique (title);
exception when duplicate_table or duplicate_object then null; end $$;
