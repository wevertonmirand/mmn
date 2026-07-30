-- ============================================================================
--  CRIAR USUÁRIO ADMIN DE TESTE
--
--  Login no site:  admin@admin.com
--  Senha:          admin
--  Usuário no app: admin  (é o que forma o link /loja/admin)
--
--  Cole no SQL Editor do Supabase e clique em RUN.
--
--  ⚠️ O login do app é por E-MAIL, não por nome de usuário — o Supabase Auth
--     funciona assim. Use admin@admin.com para entrar.
--
--  ⚠️ SÓ PARA TESTE. Senha de 5 caracteres, abaixo do mínimo do Supabase.
--     Antes de divulgar o site, troque em Authentication → Users → o usuário
--     → Reset password, ou apague e crie uma conta de verdade.
-- ============================================================================

set search_path = public, extensions;

do $$
declare
  v_email text := 'admin@admin.com';
  v_pass  text := 'admin';
  v_user  text := 'admin';
  v_name  text := 'Administrador';
  v_id    uuid;
  v_has_provider_id boolean;
begin
  -- Já existe? Então só garante senha, confirmação de e-mail e admin.
  select id into v_id from auth.users where email = v_email;

  if v_id is not null then
    update auth.users
       set encrypted_password = crypt(v_pass, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;

    raise notice 'Usuário já existia — senha redefinida para: %', v_pass;
  else
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      now(),                                     -- confirmado: login liberado
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_name, 'username', v_user),
      now(),
      now()
    );

    -- O GoTrue espera uma identidade para o provider de e-mail.
    -- provider_id só existe em versões mais novas, daí o SQL dinâmico.
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'identities'
        and column_name = 'provider_id'
    ) into v_has_provider_id;

    if v_has_provider_id then
      execute $q$
        insert into auth.identities
          (provider_id, user_id, identity_data, provider,
           last_sign_in_at, created_at, updated_at)
        values ($1, $1::uuid, $2, 'email', now(), now(), now())
      $q$ using v_id::text, jsonb_build_object('sub', v_id::text, 'email', v_email);
    else
      execute $q$
        insert into auth.identities
          (user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        values ($1::uuid, $2, 'email', now(), now(), now())
      $q$ using v_id::text, jsonb_build_object('sub', v_id::text, 'email', v_email);
    end if;

    raise notice 'Usuário criado: %  senha: %', v_email, v_pass;
  end if;

  -- O trigger de signup cria o perfil em public.users. Se por algum motivo
  -- não existir (trigger ausente), cria aqui.
  if not exists (select 1 from public.users where id = v_id) then
    insert into public.users (id, username, full_name, email, is_admin)
    values (v_id, v_user, v_name, v_email, true);
    raise notice 'Perfil criado manualmente em public.users';
  end if;

  -- Garante username e admin (roda como postgres, então o trigger de
  -- imutabilidade não bloqueia).
  update public.users
     set username = v_user, is_admin = true
   where id = v_id;

  raise notice 'Pronto: entre com % / %', v_email, v_pass;
end $$;

-- Conferir:
select u.username, u.full_name, u.is_admin, a.email,
       a.email_confirmed_at is not null as email_confirmado
from public.users u
join auth.users a on a.id = u.id
where a.email = 'admin@admin.com';
