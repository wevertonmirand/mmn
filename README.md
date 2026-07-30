# Aurum Afiliados

Dashboard mobile-first para operação de uma rede unilevel, com motor de pontos,
compressão dinâmica e administração de ativações, vendas e prêmios.

## Início rápido

1. Copie `.env.example` para `.env.local` e configure as chaves do Supabase.
2. Execute, nesta ordem, `supabase/migrations/001_initial_schema.sql` e
   `supabase/migrations/002_production_hardening.sql` no SQL Editor do projeto.
3. Instale e inicie a aplicação com `npm install && npm run dev`.

## Rotas

- `/`: home do afiliado;
- `/vendas`: CRM manual de vendas;
- `/rede`: visualização da downline;
- `/materiais`: galeria sem cortes ou filtros;
- `/admin`: central operacional protegida no servidor pela sessão e flag do Super Admin.

As políticas RLS são a fronteira de segurança definitiva: usuários só consultam o
próprio perfil e sua downline, enquanto operações administrativas exigem a flag
`is_super_admin` ou a `service_role`.

## Publicação

1. Crie um projeto Supabase vazio e execute as duas migrations, uma por vez.
2. Em Authentication, crie o primeiro usuário. No SQL Editor, insira um perfil em
   `public.users` usando o mesmo UUID e defina `is_super_admin = true`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` localmente
   e na Vercel. Nunca exponha a chave `service_role`.
4. Rode `npm install`, versione o `package-lock.json`, valide com `npm run build` e
   importe o repositório GitHub na Vercel.

Exemplo do primeiro perfil administrativo:

```sql
insert into public.users (id, username, is_super_admin)
values ('UUID_CRIADO_EM_AUTH_USERS', 'superadmin', true);
```
