-- 011 — Nome público do afiliado e link de indicação
-- A alteração passa exclusivamente por RPC para validar formato e disponibilidade.

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and lower(btrim(coalesce(p_username, ''))) ~ '^[a-z0-9._-]{3,30}$'
    and not exists (
      select 1
      from public.users
      where lower(username) = lower(btrim(p_username))
        and id <> auth.uid()
    );
$$;

create or replace function public.change_my_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;

  if v_username !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'Use de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado';
  end if;

  -- O índice UNIQUE também protege contra duas pessoas confirmando o mesmo
  -- nome simultaneamente; esta mensagem antecipada melhora a experiência.
  if exists (
    select 1 from public.users
    where lower(username) = v_username and id <> auth.uid()
  ) then
    raise exception 'Este nome de indicação já está em uso';
  end if;

  update public.users
     set username = v_username
   where id = auth.uid()
     and not is_inactive;

  if not found then
    raise exception 'Afiliado não encontrado ou inativo';
  end if;

  return v_username;
exception
  when unique_violation then
    raise exception 'Este nome de indicação acabou de ser escolhido por outra pessoa';
end;
$$;

revoke all on function public.is_username_available(text) from public;
revoke all on function public.change_my_username(text) from public;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.change_my_username(text) to authenticated;
