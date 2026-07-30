-- 013 — Reparo defensivo da leitura de comissões.
-- Pode ser executada após 010/012 em bancos nos quais uma versão anterior da
-- policy foi tentada. commission_ledger não possui user_id: o beneficiário da
-- comissão é identificado por beneficiary_id.

alter table public.commission_ledger enable row level security;

drop policy if exists own_or_admin on public.commission_ledger;
drop policy if exists commissions_select on public.commission_ledger;

create policy commissions_select on public.commission_ledger
  for select
  using (
    beneficiary_id = auth.uid()
    or public.is_admin()
  );

notify pgrst, 'reload schema';
