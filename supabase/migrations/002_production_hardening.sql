-- Correções de autorização e RPCs seguras para uso pelo frontend autenticado.
create or replace function public.is_service_role()
returns boolean language sql stable set search_path=public as $$
  select coalesce(auth.jwt()->>'role','') = 'service_role';
$$;

create or replace function public.compressed_downline(root_id uuid default auth.uid(), max_valid_depth integer default 5)
returns table(user_id uuid, sponsor_id uuid, username text, valid_level integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if root_id <> auth.uid() and not public.is_super_admin() then raise exception 'crossline access denied'; end if;
  return query with recursive tree as (
    select u.id,u.sponsor_id,u.username,u.is_inactive,case when u.is_inactive then 0 else 1 end,array[root_id,u.id]::uuid[]
    from public.users u where u.sponsor_id=root_id
    union all
    select u.id,u.sponsor_id,u.username,u.is_inactive,t.depth+case when u.is_inactive then 0 else 1 end,t.path||u.id
    from tree t join public.users u on u.sponsor_id=t.id
    where t.depth<least(greatest(max_valid_depth,1),5) and not u.id=any(t.path)
  ) select t.id,t.sponsor_id,t.username,t.depth from tree t where not t.is_inactive and t.depth between 1 and least(greatest(max_valid_depth,1),5);
end $$;

-- Clientes solicitam cancelamento por RPC: nenhuma outra coluna da venda é alterável.
create or replace function public.request_sale_cancellation(p_sale_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
begin
  update public.sales set status='pending_cancellation',cancellation_requested_at=now()
  where id=p_sale_id and user_id=auth.uid() and status='confirmed';
  if not found then raise exception 'sale not found or cannot be cancelled'; end if;
end $$;

create or replace function public.reject_sale_cancellation(p_sale_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_super_admin() then raise exception 'admin only'; end if;
  update public.sales set status='confirmed',cancellation_requested_at=null,cancellation_reviewed_at=now(),cancellation_reviewed_by=auth.uid()
  where id=p_sale_id and status='pending_cancellation';
  if not found then raise exception 'sale not pending'; end if;
end $$;

-- A venda é a fonte confiável; o cliente nunca chama record_points diretamente.
create or replace function public.score_confirmed_sale()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.record_points(new.user_id,'product_sale',new.id,new.base_points);
  return new;
end $$;
create trigger sales_score_after_insert after insert on public.sales for each row when (new.status='confirmed') execute function public.score_confirmed_sale();

revoke update on public.sales from authenticated;
drop policy if exists sales_request_cancel on public.sales;
revoke execute on function public.record_points(uuid,public.point_origin,uuid,integer) from public,anon,authenticated;
grant execute on function public.request_sale_cancellation(uuid) to authenticated;
grant execute on function public.reject_sale_cancellation(uuid) to authenticated;
grant execute on function public.approve_sale_cancellation(uuid) to authenticated;
revoke execute on function public.compressed_downline(uuid,integer) from public,anon;
grant execute on function public.compressed_downline(uuid,integer) to authenticated;
revoke execute on function public.is_in_downline(uuid,uuid) from public,anon,authenticated;

-- Fechamento mensal é chamado por um Super Admin autenticado.
revoke execute on function public.close_month(date) from service_role;
grant execute on function public.close_month(date) to authenticated;
