-- =============================================================
-- 006 — Identidade visual configurável
-- Nome e logos ficam no banco, editáveis em /admin/configuracoes,
-- para renomear a marca sem tocar em código nem publicar de novo.
-- =============================================================

alter table public.settings
  add column if not exists brand_name    text not null default 'Shopurbanus MCI',
  add column if not exists brand_tagline text,
  -- logo horizontal, usado no cabeçalho e nas telas de entrada
  add column if not exists logo_url      text,
  -- marca quadrada, usada como ícone do app (PWA) e avatar de fallback
  add column if not exists logo_icon_url text;

do $$ begin
  alter table public.settings
    add constraint settings_brand_name_not_blank
    check (length(btrim(brand_name)) > 0);
exception when duplicate_object or duplicate_table then null; end $$;

-- -------------------------------------------------------------
-- A vitrine (/loja) é pública, então a marca precisa ser legível
-- sem sessão. `settings` inteira não pode ser: guarda metas de
-- ativação e multiplicadores de pontuação.
--
-- Esta view roda com o dono (sem security_invoker) justamente para
-- atravessar o RLS da tabela base e expor SÓ estas colunas.
-- -------------------------------------------------------------
create or replace view public.v_public_branding as
select
  brand_name,
  brand_tagline,
  logo_url,
  logo_icon_url,
  theme,
  gamification_enabled
from public.settings
where id = true;

grant select on public.v_public_branding to anon, authenticated;
