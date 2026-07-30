-- 012 — Compatibilidade para instalações em que 010 foi executada antes da
-- correção de RLS ou cujo cache do PostgREST não foi atualizado.
-- Não duplica estruturas: apenas garante as colunas e recarrega o schema.

alter table public.settings
  add column if not exists commission_level_1 numeric(5,2) not null default 5
    check (commission_level_1 >= 0),
  add column if not exists commission_level_2 numeric(5,2) not null default 3
    check (commission_level_2 >= 0),
  add column if not exists commission_level_3 numeric(5,2) not null default 2
    check (commission_level_3 >= 0),
  add column if not exists commission_level_4 numeric(5,2) not null default 1
    check (commission_level_4 >= 0),
  add column if not exists commission_level_5 numeric(5,2) not null default 1
    check (commission_level_5 >= 0);

create or replace function public.fn_validate_commissions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.commission_level_1
     + new.commission_level_2
     + new.commission_level_3
     + new.commission_level_4
     + new.commission_level_5 > 100 then
    raise exception 'A soma das comissões não pode ultrapassar 100%%';
  end if;

  return new;
end;
$$;

drop trigger if exists settings_validate_commissions on public.settings;
create trigger settings_validate_commissions
  before insert or update on public.settings
  for each row execute function public.fn_validate_commissions();

notify pgrst, 'reload schema';
