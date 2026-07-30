-- 010 — Loja interna, estoque, CRM e comissões (aplicar após 009)
-- Toda mutação financeira/estoque ocorre nas RPCs abaixo, sob lock de linha.
alter table public.settings
  add column if not exists commission_level_1 numeric(5,2) not null default 5 check (commission_level_1 >= 0),
  add column if not exists commission_level_2 numeric(5,2) not null default 3 check (commission_level_2 >= 0),
  add column if not exists commission_level_3 numeric(5,2) not null default 2 check (commission_level_3 >= 0),
  add column if not exists commission_level_4 numeric(5,2) not null default 1 check (commission_level_4 >= 0),
  add column if not exists commission_level_5 numeric(5,2) not null default 1 check (commission_level_5 >= 0);

create or replace function public.fn_validate_commissions() returns trigger language plpgsql as $$
begin
  if new.commission_level_1 + new.commission_level_2 + new.commission_level_3 + new.commission_level_4 + new.commission_level_5 > 100 then
    raise exception 'A soma das comissões não pode ultrapassar 100%%';
  end if; return new;
end $$;
drop trigger if exists settings_validate_commissions on public.settings;
create trigger settings_validate_commissions before insert or update on public.settings for each row execute function public.fn_validate_commissions();

alter table public.orders add column if not exists buyer_id uuid references public.users(id),
  add column if not exists processed_at timestamptz, add column if not exists reversed_at timestamptz;
alter table public.orders alter column customer_id drop not null;
alter table public.points_ledger add column if not exists order_id uuid references public.orders(id);
create unique index if not exists points_internal_order_once on public.points_ledger(order_id,user_id,level) where origin='adjustment' and not is_reversal;

create table if not exists public.inventory (
  user_id uuid not null references public.users(id), product_id uuid not null references public.products(id),
  available_quantity int not null default 0 check(available_quantity >= 0), sold_quantity int not null default 0 check(sold_quantity >= 0),
  average_cost_cents int not null default 0 check(average_cost_cents >= 0), updated_at timestamptz not null default now(),
  primary key(user_id,product_id)
);
create table if not exists public.crm_customers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), name text not null,
  email text, phone text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.crm_sales (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), customer_id uuid references public.crm_customers(id),
  total_cents int not null default 0, cost_cents int not null default 0, status text not null default 'completed' check(status in('completed','cancelled')),
  idempotency_key text not null, sold_at timestamptz not null default now(), cancelled_at timestamptz,
  unique(user_id,idempotency_key)
);
create table if not exists public.crm_sale_items (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.crm_sales(id), product_id uuid not null references public.products(id),
  quantity int not null check(quantity>0), unit_price_cents int not null check(unit_price_cents>=0), unit_cost_cents int not null check(unit_cost_cents>=0)
);
create table if not exists public.inventory_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), product_id uuid not null references public.products(id),
  quantity int not null check(quantity<>0), unit_cost_cents int not null check(unit_cost_cents>=0), kind text not null check(kind in('order_in','order_reversal','crm_sale','crm_cancellation')),
  order_id uuid references public.orders(id), crm_sale_id uuid references public.crm_sales(id), reverses_id uuid references public.inventory_ledger(id), created_at timestamptz not null default now()
);
create unique index if not exists inventory_ledger_reversal_once on public.inventory_ledger(reverses_id) where reverses_id is not null;
create unique index if not exists inventory_order_product_once on public.inventory_ledger(order_id,product_id) where kind='order_in';

create table if not exists public.commission_ledger (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), beneficiary_id uuid not null references public.users(id),
 buyer_id uuid not null references public.users(id), level int not null check(level between 1 and 5), percentage numeric(5,2) not null check(percentage>=0),
 base_cents int not null, amount_cents int not null, status text not null check(status in('credited','reversed')),
 is_reversal boolean not null default false, reverses_id uuid references public.commission_ledger(id), created_at timestamptz not null default now()
);
create unique index if not exists commission_order_level_once on public.commission_ledger(order_id,level) where not is_reversal;
create unique index if not exists commission_reversal_once on public.commission_ledger(reverses_id) where reverses_id is not null;

create table if not exists public.network_removal_audit (
 id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.users(id), removed_user_id uuid not null references public.users(id),
 previous_sponsor_id uuid references public.users(id), reassigned_user_ids uuid[] not null default '{}', reason text not null, created_at timestamptz not null default now()
);

create or replace function public.place_internal_order(p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_n bigint; v_count int; v_total int; v_points int;
begin
 if auth.uid() is null or not exists(select 1 from users where id=auth.uid() and not is_inactive) then raise exception 'Afiliado inválido ou inativo'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Carrinho vazio'; end if;
 insert into orders(buyer_id,contact_name,contact_phone,contact_email,status)
 select id,full_name,coalesce(phone,'Não informado'),email,'novo' from users where id=auth.uid() returning id,order_number into v_id,v_n;
 with req as (select (x->>'product_id')::uuid product_id,(x->>'quantity')::int quantity from jsonb_array_elements(p_items)x), ins as (
  insert into order_items(order_id,product_id,product_name,quantity,unit_price_cents,unit_points)
  select v_id,p.id,p.name,r.quantity,p.price_cents,p.points_value from req r join products p on p.id=r.product_id and p.is_active where r.quantity between 1 and 999
  returning quantity,unit_price_cents,unit_points)
 select count(*),coalesce(sum(quantity*unit_price_cents),0),coalesce(sum(quantity*unit_points),0) into v_count,v_total,v_points from ins;
 if v_count=0 then raise exception 'Nenhum produto válido'; end if;
 update orders set total_cents=v_total,total_points=v_points where id=v_id;
 return jsonb_build_object('order_id',v_id,'order_number',v_n,'items',v_count,'total_cents',v_total,'total_points',v_points);
end $$;

create or replace function public.close_order(p_order_id uuid,p_notes text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders; i record; u record; pct numeric; amt int;
begin
 if not is_admin() then raise exception 'Apenas administradores podem aprovar pedidos'; end if;
 select * into o from orders where id=p_order_id for update;
 if o.id is null or o.buyer_id is null then raise exception 'Pedido interno não encontrado'; end if;
 if o.processed_at is not null then return jsonb_build_object('order_id',o.id,'already_processed',true); end if;
 if o.status='cancelado' then raise exception 'Pedido cancelado'; end if;
 for i in select * from order_items where order_id=o.id loop
  insert into inventory(user_id,product_id,available_quantity,average_cost_cents) values(o.buyer_id,i.product_id,i.quantity,i.unit_price_cents)
  on conflict(user_id,product_id) do update set average_cost_cents=((inventory.available_quantity*inventory.average_cost_cents)+(excluded.available_quantity*excluded.average_cost_cents))/greatest(inventory.available_quantity+excluded.available_quantity,1),available_quantity=inventory.available_quantity+excluded.available_quantity,updated_at=now();
  insert into inventory_ledger(user_id,product_id,quantity,unit_cost_cents,kind,order_id) values(o.buyer_id,i.product_id,i.quantity,i.unit_price_cents,'order_in',o.id);
 end loop;
 insert into points_ledger(user_id,source_user_id,origin,base_points,multiplier,level,order_id,description) values(o.buyer_id,o.buyer_id,'adjustment',o.total_points,1,0,o.id,'Compra na loja interna');
 update users set lifetime_points=lifetime_points+o.total_points where id=o.buyer_id;
 for u in select * from get_compressed_upline(o.buyer_id,5) loop
  pct := case u.effective_level when 1 then (select commission_level_1 from settings where id) when 2 then (select commission_level_2 from settings where id) when 3 then (select commission_level_3 from settings where id) when 4 then (select commission_level_4 from settings where id) else (select commission_level_5 from settings where id) end;
  amt:=round(o.total_cents*pct/100); insert into commission_ledger(order_id,beneficiary_id,buyer_id,level,percentage,base_cents,amount_cents,status) values(o.id,u.user_id,o.buyer_id,u.effective_level,pct,o.total_cents,amt,'credited');
 end loop;
 update orders set status='fechado',closed_at=now(),processed_at=now(),reviewed_by=auth.uid(),admin_notes=coalesce(p_notes,admin_notes) where id=o.id;
 return jsonb_build_object('order_id',o.id,'already_processed',false);
end $$;

create or replace function public.create_crm_sale(p_customer_id uuid,p_items jsonb,p_idempotency_key text) returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid; x record; inv inventory; total int:=0; cost int:=0;
begin
 if exists(select 1 from crm_sales where user_id=auth.uid() and idempotency_key=p_idempotency_key) then select id into sid from crm_sales where user_id=auth.uid() and idempotency_key=p_idempotency_key; return sid; end if;
 if p_customer_id is not null and not exists(select 1 from crm_customers where id=p_customer_id and user_id=auth.uid()) then raise exception 'Cliente inválido'; end if;
 insert into crm_sales(user_id,customer_id,idempotency_key) values(auth.uid(),p_customer_id,p_idempotency_key) returning id into sid;
 for x in select (j->>'product_id')::uuid product_id,(j->>'quantity')::int quantity,(j->>'unit_price_cents')::int price from jsonb_array_elements(p_items)j loop
  select * into inv from inventory where user_id=auth.uid() and product_id=x.product_id for update;
  if x.quantity<=0 or inv.available_quantity<x.quantity then raise exception 'Estoque insuficiente'; end if;
  update inventory set available_quantity=available_quantity-x.quantity,sold_quantity=sold_quantity+x.quantity,updated_at=now() where user_id=auth.uid() and product_id=x.product_id;
  insert into crm_sale_items(sale_id,product_id,quantity,unit_price_cents,unit_cost_cents) values(sid,x.product_id,x.quantity,x.price,inv.average_cost_cents);
  insert into inventory_ledger(user_id,product_id,quantity,unit_cost_cents,kind,crm_sale_id) values(auth.uid(),x.product_id,-x.quantity,inv.average_cost_cents,'crm_sale',sid);
  total:=total+x.quantity*x.price; cost:=cost+x.quantity*inv.average_cost_cents;
 end loop; update crm_sales set total_cents=total,cost_cents=cost where id=sid; return sid;
end $$;

create or replace function public.cancel_crm_sale(p_sale_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare s crm_sales; x record;
begin select * into s from crm_sales where id=p_sale_id and user_id=auth.uid() for update; if s.id is null or s.status<>'completed' then raise exception 'Venda inexistente ou já cancelada'; end if;
 for x in select * from inventory_ledger where crm_sale_id=s.id and kind='crm_sale' loop
  update inventory set available_quantity=available_quantity-x.quantity,sold_quantity=sold_quantity+x.quantity where user_id=s.user_id and product_id=x.product_id;
  insert into inventory_ledger(user_id,product_id,quantity,unit_cost_cents,kind,crm_sale_id,reverses_id) values(s.user_id,x.product_id,-x.quantity,x.unit_cost_cents,'crm_cancellation',s.id,x.id);
 end loop; update crm_sales set status='cancelled',cancelled_at=now() where id=s.id; end $$;

create or replace function public.cancel_order(p_order_id uuid,p_notes text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders; x record;
begin if not is_admin() then raise exception 'Apenas administradores podem cancelar pedidos'; end if; select * into o from orders where id=p_order_id for update;
 if o.id is null or o.status='cancelado' then raise exception 'Pedido inexistente ou já cancelado'; end if;
 if o.processed_at is not null then
  if exists(select 1 from inventory_ledger l join inventory i using(user_id,product_id) where l.order_id=o.id and l.kind='order_in' and i.available_quantity<l.quantity) then raise exception 'Cancelamento bloqueado: parte do estoque deste pedido já foi vendida'; end if;
  for x in select * from inventory_ledger where order_id=o.id and kind='order_in' loop update inventory set available_quantity=available_quantity-x.quantity where user_id=x.user_id and product_id=x.product_id; insert into inventory_ledger(user_id,product_id,quantity,unit_cost_cents,kind,order_id,reverses_id) values(x.user_id,x.product_id,-x.quantity,x.unit_cost_cents,'order_reversal',o.id,x.id); end loop;
  insert into points_ledger(user_id,source_user_id,origin,base_points,multiplier,level,order_id,is_reversal,reverses_id,description) select user_id,source_user_id,origin,-base_points,multiplier,level,order_id,true,id,'Estorno de pedido' from points_ledger where order_id=o.id and not is_reversal;
  update users set lifetime_points=lifetime_points-o.total_points where id=o.buyer_id;
  insert into commission_ledger(order_id,beneficiary_id,buyer_id,level,percentage,base_cents,amount_cents,status,is_reversal,reverses_id) select order_id,beneficiary_id,buyer_id,level,percentage,-base_cents,-amount_cents,'reversed',true,id from commission_ledger where order_id=o.id and not is_reversal;
 end if; update orders set status='cancelado',cancelled_at=now(),reversed_at=case when processed_at is null then null else now() end,reviewed_by=auth.uid(),admin_notes=coalesce(p_notes,admin_notes) where id=o.id; return jsonb_build_object('order_id',o.id); end $$;

create or replace function public.remove_affiliate(p_user_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare old uuid; children uuid[];
begin if not is_admin() then raise exception 'Apenas administradores'; end if; if coalesce(btrim(p_reason),'')='' then raise exception 'Motivo obrigatório'; end if;
 if (select is_admin from users where id=p_user_id) and (select count(*) from users where is_admin and not is_inactive)=1 then raise exception 'Não é possível remover o último administrador'; end if;
 select sponsor_id into old from users where id=p_user_id for update; select coalesce(array_agg(id),'{}') into children from users where sponsor_id=p_user_id;
 update users set sponsor_id=old where sponsor_id=p_user_id; update users set is_inactive=true where id=p_user_id;
 insert into network_removal_audit(admin_id,removed_user_id,previous_sponsor_id,reassigned_user_ids,reason) values(auth.uid(),p_user_id,old,children,p_reason); end $$;

alter table inventory enable row level security;
alter table inventory_ledger enable row level security;
alter table crm_customers enable row level security;
alter table crm_sales enable row level security;
alter table crm_sale_items enable row level security;
alter table commission_ledger enable row level security;
alter table network_removal_audit enable row level security;

-- As quatro tabelas abaixo possuem user_id. commission_ledger é tratada
-- separadamente porque o dono da linha é beneficiary_id, não user_id.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'inventory',
    'inventory_ledger',
    'crm_customers',
    'crm_sales'
  ] loop
    execute format('drop policy if exists own_or_admin on public.%I', v_table);
    execute format(
      'create policy own_or_admin on public.%I for select using (user_id = auth.uid() or public.is_admin())',
      v_table
    );
  end loop;
end $$;

-- DROP + CREATE deixa esta seção segura para reaplicação manual depois de
-- uma execução parcial no SQL Editor.
drop policy if exists crm_customers_insert on public.crm_customers;
create policy crm_customers_insert on public.crm_customers
  for insert with check (user_id = auth.uid());

drop policy if exists crm_customers_update on public.crm_customers;
create policy crm_customers_update on public.crm_customers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists crm_sale_items_select on public.crm_sale_items;
create policy crm_sale_items_select on public.crm_sale_items
  for select using (
    exists (
      select 1 from public.crm_sales s
      where s.id = sale_id
        and (s.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists commissions_select on public.commission_ledger;
create policy commissions_select on public.commission_ledger
  for select using (beneficiary_id = auth.uid() or public.is_admin());

drop policy if exists audits_admin on public.network_removal_audit;
create policy audits_admin on public.network_removal_audit
  for select using (public.is_admin());

drop policy if exists orders_buyer_select on public.orders;
create policy orders_buyer_select on public.orders
  for select using (buyer_id = auth.uid());
insert into storage.buckets(id,name,public) values('product-images','product-images',true) on conflict(id) do update set public=true;
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
grant execute on function place_internal_order(jsonb),create_crm_sale(uuid,jsonb,text),cancel_crm_sale(uuid),remove_affiliate(uuid,text) to authenticated;
