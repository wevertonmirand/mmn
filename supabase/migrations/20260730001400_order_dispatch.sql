-- =============================================================
-- 014 — close_order / cancel_order atendem os DOIS tipos de pedido
--
-- A migração 010 (comércio interno) substituiu close_order por uma versão
-- que só aceita pedido com `buyer_id` — o afiliado comprando estoque. Com
-- isso a loja de clientes parou de funcionar: fechar um pedido feito por um
-- cliente passou a responder "Pedido interno não encontrado", e nenhuma
-- venda ou ponto era gerado.
--
-- As duas operações são legítimas e convivem na mesma tabela, distinguidas
-- por qual coluna está preenchida:
--
--   buyer_id    -> afiliado comprando estoque  : entra em inventory,
--                                                paga comissão em dinheiro
--   customer_id -> cliente comprando na loja   : gera uma venda por item,
--                                                distribui pontos na rede
--
-- Esta migração recoloca o despacho por tipo, sem alterar nenhum dos dois
-- comportamentos.
-- =============================================================

-- -------------------------------------------------------------
-- Compra de estoque pelo afiliado (comportamento da 010)
-- -------------------------------------------------------------
create or replace function public.fn_close_internal_order(o public.orders, p_notes text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i   record;
  u   record;
  pct numeric;
  amt int;
begin
  if o.processed_at is not null then
    return jsonb_build_object('order_id', o.id, 'already_processed', true);
  end if;

  for i in select * from order_items where order_id = o.id loop
    insert into inventory (user_id, product_id, available_quantity, average_cost_cents)
    values (o.buyer_id, i.product_id, i.quantity, i.unit_price_cents)
    on conflict (user_id, product_id) do update
      set average_cost_cents =
            ((inventory.available_quantity * inventory.average_cost_cents)
             + (excluded.available_quantity * excluded.average_cost_cents))
            / greatest(inventory.available_quantity + excluded.available_quantity, 1),
          available_quantity = inventory.available_quantity + excluded.available_quantity,
          updated_at = now();

    insert into inventory_ledger
      (user_id, product_id, quantity, unit_cost_cents, kind, order_id)
    values (o.buyer_id, i.product_id, i.quantity, i.unit_price_cents, 'order_in', o.id);
  end loop;

  insert into points_ledger
    (user_id, source_user_id, origin, base_points, multiplier, level, order_id, description)
  values (o.buyer_id, o.buyer_id, 'adjustment', o.total_points, 1, 0, o.id,
          'Compra na loja interna');

  update users set lifetime_points = lifetime_points + o.total_points where id = o.buyer_id;

  for u in select * from get_compressed_upline(o.buyer_id, 5) loop
    pct := case u.effective_level
             when 1 then (select commission_level_1 from settings where id)
             when 2 then (select commission_level_2 from settings where id)
             when 3 then (select commission_level_3 from settings where id)
             when 4 then (select commission_level_4 from settings where id)
             else        (select commission_level_5 from settings where id)
           end;
    amt := round(o.total_cents * pct / 100);

    insert into commission_ledger
      (order_id, beneficiary_id, buyer_id, level, percentage, base_cents, amount_cents, status)
    values (o.id, u.user_id, o.buyer_id, u.effective_level, pct, o.total_cents, amt, 'credited');
  end loop;

  update orders
     set status = 'fechado', closed_at = now(), processed_at = now(),
         reviewed_by = auth.uid(), admin_notes = coalesce(p_notes, admin_notes)
   where id = o.id;

  return jsonb_build_object('order_id', o.id, 'already_processed', false);
end;
$$;

-- -------------------------------------------------------------
-- Venda da loja para cliente final (comportamento da 005)
-- Uma linha em `sales` por item: a ativação mensal conta unidades e os
-- pontos variam por produto, então um registro agregado quebraria uma das
-- duas contas.
-- -------------------------------------------------------------
create or replace function public.fn_close_customer_order(o public.orders, p_notes text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sales int := 0;
begin
  if o.status = 'fechado' or o.processed_at is not null then
    raise exception 'Pedido já está fechado';
  end if;

  if o.referred_by is not null then
    with created as (
      insert into sales
        (user_id, product_name, quantity, base_points, customer_name, notes, order_id, product_id)
      select o.referred_by, i.product_name, i.quantity, i.unit_points,
             o.contact_name, format('Pedido #%s da loja', o.order_number), o.id, i.product_id
      from order_items i
      where i.order_id = o.id
      returning 1
    )
    select count(*)::int into v_sales from created;
  end if;

  update orders
     set status = 'fechado', closed_at = now(), processed_at = now(),
         reviewed_by = auth.uid(), admin_notes = coalesce(p_notes, admin_notes)
   where id = o.id;

  return jsonb_build_object(
    'order_id', o.id,
    'sales_created', v_sales,
    'points_distributed', o.referred_by is not null,
    'total_points', o.total_points
  );
end;
$$;

-- -------------------------------------------------------------
-- Despacho
-- -------------------------------------------------------------
create or replace function public.close_order(p_order_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem fechar pedidos';
  end if;

  select * into o from public.orders where id = p_order_id for update;

  if o.id is null then
    raise exception 'Pedido não encontrado';
  end if;

  if o.status = 'cancelado' then
    raise exception 'Pedido cancelado não pode ser fechado';
  end if;

  if o.buyer_id is not null then
    return public.fn_close_internal_order(o, p_notes);
  end if;

  return public.fn_close_customer_order(o, p_notes);
end;
$$;

create or replace function public.cancel_order(p_order_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o          public.orders;
  x          record;
  v_sale     record;
  v_reversed int := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem cancelar pedidos';
  end if;

  select * into o from public.orders where id = p_order_id for update;

  if o.id is null or o.status = 'cancelado' then
    raise exception 'Pedido inexistente ou já cancelado';
  end if;

  if o.buyer_id is not null then
    -- Compra de estoque: devolve o estoque e estorna pontos e comissões.
    if o.processed_at is not null then
      if exists (
        select 1 from inventory_ledger l
        join inventory i using (user_id, product_id)
        where l.order_id = o.id and l.kind = 'order_in'
          and i.available_quantity < l.quantity
      ) then
        raise exception 'Cancelamento bloqueado: parte do estoque deste pedido já foi vendida';
      end if;

      for x in select * from inventory_ledger where order_id = o.id and kind = 'order_in' loop
        update inventory
           set available_quantity = available_quantity - x.quantity
         where user_id = x.user_id and product_id = x.product_id;

        insert into inventory_ledger
          (user_id, product_id, quantity, unit_cost_cents, kind, order_id, reverses_id)
        values (x.user_id, x.product_id, -x.quantity, x.unit_cost_cents,
                'order_reversal', o.id, x.id);
      end loop;

      insert into points_ledger
        (user_id, source_user_id, origin, base_points, multiplier, level,
         order_id, is_reversal, reverses_id, description)
      select user_id, source_user_id, origin, -base_points, multiplier, level,
             order_id, true, id, 'Estorno de pedido'
      from points_ledger where order_id = o.id and not is_reversal;

      update users set lifetime_points = lifetime_points - o.total_points where id = o.buyer_id;

      insert into commission_ledger
        (order_id, beneficiary_id, buyer_id, level, percentage, base_cents,
         amount_cents, status, is_reversal, reverses_id)
      select order_id, beneficiary_id, buyer_id, level, percentage, -base_cents,
             -amount_cents, 'reversed', true, id
      from commission_ledger where order_id = o.id and not is_reversal;
    end if;
  else
    -- Venda para cliente: estorna os pontos das vendas geradas no fechamento.
    for v_sale in select id from sales where order_id = o.id and status <> 'cancelada' loop
      v_reversed := v_reversed + public.fn_reverse_sale_points(v_sale.id);
      update sales
         set status = 'cancelada', cancelled_at = now(), reviewed_by = auth.uid()
       where id = v_sale.id;
    end loop;
  end if;

  update orders
     set status = 'cancelado', cancelled_at = now(),
         reversed_at = case when processed_at is null then null else now() end,
         reviewed_by = auth.uid(), admin_notes = coalesce(p_notes, admin_notes)
   where id = o.id;

  return jsonb_build_object('order_id', o.id, 'ledger_rows_reversed', v_reversed);
end;
$$;

revoke execute on function public.fn_close_internal_order(public.orders, text) from authenticated, anon;
revoke execute on function public.fn_close_customer_order(public.orders, text) from authenticated, anon;
grant execute on function public.close_order(uuid, text)  to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
