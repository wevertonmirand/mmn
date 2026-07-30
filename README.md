# Plataforma de Afiliados (Unilevel) + Loja

Next.js 16 + Supabase. Rede unilevel com lateralidade infinita, 5 níveis de
pontuação, compressão dinâmica, painel do afiliado mobile-first (PWA), painel
administrativo restrito e loja onde o cliente faz o pedido e o admin fecha a
venda no contato.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19**
- **Supabase** (Postgres + Auth + RLS)
- **Tailwind CSS** — design system branco e dourado (`#D4AF37`)

---

# Instalação passo a passo

Do zero até o app rodando. Tempo estimado: 15 minutos.

## Pré-requisitos

| Ferramenta | Versão | Onde |
|---|---|---|
| Node.js | 18.18+ (recomendado 20 LTS) | https://nodejs.org |
| Git | qualquer | https://git-scm.com/download/win |
| Conta Supabase | gratuita | https://supabase.com |
| Conta Vercel | gratuita, só para publicar | https://vercel.com |

Confirme no terminal antes de seguir:

```bash
node --version    # v18.18 ou maior
git --version
```

## Passo 1 — Clonar o repositório

Este é um repositório **privado**, então o `git clone` precisa de autenticação.
Escolha uma das opções.

**Opção A — GitHub CLI (mais simples)**

```bash
gh auth login
gh repo clone SEU_USUARIO/SEU_REPO app
cd app
```

**Opção B — HTTPS com Personal Access Token**

Gere um token em GitHub → *Settings* → *Developer settings* →
*Personal access tokens* → *Tokens (classic)*, marcando o escopo **`repo`**.

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPO.git app
cd app
```

Quando pedir a senha, cole o **token** (a senha da conta não funciona mais).

**Opção C — SSH**

```bash
git clone git@github.com:SEU_USUARIO/SEU_REPO.git app
cd app
```

Exige uma chave SSH cadastrada em GitHub → *Settings* → *SSH and GPG keys*.

## Passo 2 — Instalar dependências

```bash
npm ci
```

Use `npm ci`, não `npm install`: ele instala exatamente as versões do
`package-lock.json`, que é o que foi testado. Se você já tinha uma pasta
`node_modules` de antes, apague-a primeiro.

Avisos de `deprecated` em pacotes do ESLint são normais e não afetam o app.
Para conferir o que importa:

```bash
npm audit --omit=dev    # deve reportar 0 vulnerabilities
```

## Passo 3 — Criar o projeto no Supabase

1. Entre em https://supabase.com/dashboard e clique em **New project**
2. Preencha:
   - **Name** — o nome que quiser
   - **Database Password** — gere uma forte e **guarde**; ela não é exibida de novo
   - **Region** — a mais próxima dos seus usuários (`South America (São Paulo)` no Brasil)
3. Clique em **Create new project** e aguarde 1–2 minutos

## Passo 4 — Aplicar o banco de dados

O SQL cria tabelas, funções, políticas de segurança e os dados iniciais.
Duas formas — a manual é a mais garantida.

### Forma A — SQL Editor (manual, recomendada na primeira vez)

No painel do Supabase, abra **SQL Editor** → **New query**. Cole e rode o
conteúdo de cada arquivo, **nesta ordem**:

1. `supabase/migrations/20260730000100_schema.sql`
2. `supabase/migrations/20260730000200_functions.sql`
3. `supabase/migrations/20260730000300_rls.sql`
4. `supabase/migrations/20260730000400_admin_views.sql`
5. `supabase/migrations/20260730000500_store.sql`
6. `supabase/migrations/20260730000600_branding.sql`
7. `supabase/migrations/20260730000700_first_admin.sql`
8. `supabase/migrations/20260730000800_auto_sponsor.sql`
9. `supabase/migrations/20260730000900_auto_username.sql`
10. `supabase/seed.sql`

Pode rodar cada um separadamente ou tudo de uma vez. O SQL é **idempotente**:
rodar de novo não duplica nada nem dá erro.

### Forma B — Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npm run db:push
```

O `PROJECT_REF` é o código na URL do painel:
`https://supabase.com/dashboard/project/`**`abcdefghijklmnop`**

> ⚠️ **Não use `npm run db:reset` em um banco com dados** — ele apaga tudo e
> recria. Serve apenas para desenvolvimento local.

### Conferir se deu certo

Ainda no SQL Editor:

```sql
select count(*) from public.ranks;      -- esperado: 6
select count(*) from public.products;   -- esperado: 5
select count(*) from public.prizes;     -- esperado: 5
```

Se algum der `relation does not exist`, algum arquivo não foi aplicado — repita
a ordem do Passo 4.

## Passo 5 — Configurar as credenciais locais

No painel do Supabase, vá em **Settings** → **API** e copie:

- **Project URL** — algo como `https://abcdefgh.supabase.co`, **sem caminho no
  final**. Se copiar a URL da API REST (`.../rest/v1`), login e cadastro
  respondem 404
- **Publishable key** — começa com `sb_publishable_...`

Crie o arquivo `.env.local` na raiz do projeto:

```bash
cp .env.example .env.local
```

No Windows, se `cp` não existir:

```cmd
copy .env.example .env.local
notepad .env.local
```

Preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> 🔒 A *publishable key* é **feita para ser pública** — ela vai no bundle do
> browser, e quem protege os dados é o RLS. Já a **`sb_secret_...` /
> `service_role` ignora o RLS por completo**: nunca a coloque em variável
> `NEXT_PUBLIC_*`, no código ou no repositório. O app recusa iniciar se
> detectar uma.

`.env.local` está no `.gitignore` e nunca é enviado ao repositório.

## Passo 6 — Rodar

```bash
npm run dev
```

Abra http://localhost:3000. Você deve cair na vitrine (`/loja`), já com os 5
produtos de exemplo.

## Passo 7 — Criar seu usuário admin

Acesse http://localhost:3000/cadastro e crie sua conta de **afiliado**.

**O primeiro afiliado cadastrado vira administrador automaticamente**, porque é
quem está montando a operação e não existe ninguém para promovê-lo. Não precisa
de link de indicação nem de SQL.

> ⚠️ Por isso, **crie sua conta antes de divulgar a URL**. Em produção, o
> primeiro a se cadastrar recebe acesso administrativo.

Feito isso, `/admin` passa a responder (antes dava 404 de propósito, para não
revelar a área a quem não é admin).

### Promover outros admins depois

No SQL Editor, autenticado como admin não é necessário — o Editor roda como
`postgres`:

```sql
update public.users set is_admin = true where username = 'outro_usuario';
```

Ou, pela RPC (respeita a regra de nunca deixar a operação sem nenhum admin):

```sql
select public.set_admin('outro_usuario');          -- promove
select public.set_admin('outro_usuario', false);   -- remove
```

### Criar um admin de teste pelo SQL Editor

Para testar rápido, sem passar pelo cadastro: rode
[`docs/criar-admin-teste.sql`](docs/criar-admin-teste.sql) no SQL Editor. Ele
cria `admin@admin.com` com senha `admin`, já confirmado e como administrador.
Rodar de novo apenas redefine a senha.

**O login é por e-mail**, não por nome de usuário — entre com
`admin@admin.com`. Troque a senha antes de divulgar o site.

### Se precisar criar o admin manualmente

Caso o cadastro pelo site falhe por algum motivo:

1. No Supabase, **Authentication** → **Users** → **Add user**
2. Informe e-mail e senha e marque **Auto Confirm User**
3. O perfil é criado automaticamente pelo trigger. Ajuste o usuário e promova:

```sql
update public.users
   set username = 'seu_usuario', is_admin = true
 where email = 'seu@email.com';
```

Crie o usuário pelo painel do Auth, não com `insert into auth.users`: o
Supabase cuida do hash da senha e das demais colunas de autenticação.

Pronto — o app está funcionando localmente.

---

# Publicar na Vercel

## Passo 1 — Importar o projeto

1. Entre em https://vercel.com/new
2. Em **Import Git Repository**, autorize o acesso à sua conta GitHub
   (para repositório privado, conceda acesso a ele na tela de permissões)
3. Selecione o repositório

Não mude *Framework Preset*, *Build Command* nem *Output Directory* — a Vercel
detecta Next.js sozinha.

## Passo 2 — Variáveis de ambiente (faça ANTES do primeiro deploy)

Ainda na tela de import, abra **Environment Variables** e adicione as três:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `NEXT_PUBLIC_SITE_URL` | `https://seu-projeto.vercel.app` |

> ⚠️ **Isto precisa vir antes do build.** Variáveis `NEXT_PUBLIC_*` são
> embutidas no bundle do browser **no momento do build**. Se você publicar sem
> elas e adicioná-las depois, o app continua quebrado até um **Redeploy** —
> adicionar a variável não basta.

Marque as três para *Production*, *Preview* e *Development*.

Ainda não sabe a URL final? Publique, copie a URL que a Vercel gerar, corrija
`NEXT_PUBLIC_SITE_URL` e faça **Redeploy**.

## Passo 3 — Deploy

Clique em **Deploy** e aguarde ~2 minutos.

## Passo 4 — Configurar as URLs no Supabase

Sem este passo a confirmação de e-mail e a recuperação de senha redirecionam
para `localhost` e falham em produção.

No painel do Supabase, **Authentication** → **URL Configuration**:

- **Site URL** — `https://seu-projeto.vercel.app`
- **Redirect URLs** — adicione:
  - `https://seu-projeto.vercel.app/**`
  - `http://localhost:3000/**` (para continuar desenvolvendo)

## Passo 5 — Conferir em produção

Abra a URL da Vercel e verifique:

- `/loja` — vitrine com os produtos
- `/cadastro` — criar conta de afiliado
- `/login` — entrar
- `/admin` — só para quem tem `is_admin = true`

### Domínio próprio (opcional)

Em **Settings** → **Domains** na Vercel, adicione seu domínio e siga as
instruções de DNS. Depois **atualize `NEXT_PUBLIC_SITE_URL` e as URLs do
Supabase** para o domínio novo, e faça Redeploy — os links de indicação e de
loja são montados a partir dessa variável.

### Deploys automáticos

A cada `git push` na branch padrão, a Vercel publica em produção. Outras
branches geram *Preview Deployments* com URL própria.

---

# Depois de publicar

## Renomear a marca e trocar os logos

Em **`/admin/configuracoes`** → **Identidade da marca**. Dá para mudar:

- **Nome da marca** — vem como `Shopurbanus MCI`
- **Frase de apoio** — opcional, aparece abaixo do nome
- **Logo principal** (horizontal) — cabeçalho da loja e telas de entrada
- **Ícone quadrado** — app instalado no celular (PWA)

O nome vale também para o título da aba do navegador e para o nome do app
instalado, então renomear não exige mexer em código nem publicar de novo.

Sem logo cadastrado, o app mostra a inicial do nome sobre o gradiente da
paleta — nunca fica quebrado.

### Como obter a URL de um logo

1. No Supabase, vá em **Storage** → **New bucket**
2. Nome `branding`, marque **Public bucket**
3. Faça upload do arquivo
4. Clique nele → **Copy URL**
5. Cole no campo correspondente em `/admin/configuracoes`

PNG com fundo transparente fica melhor. As imagens são exibidas com
`object-contain`: o logo nunca é cortado nem esticado.

## Cadastrar seus produtos

Em `/admin/produtos`. O campo **pontos por unidade** é quanto a venda daquele
produto injeta na rede quando você fecha o pedido.

Os 5 produtos do seed são exemplos — desative ou apague e cadastre os seus.

## Ajustar graduações e prêmios

- Graduações: tabela `ranks` (`required_points`, `maintenance_points`)
- Prêmios: `/admin/premios`
- Meta mensal de ativação: `/admin/configuracoes`

## Materiais de marketing

O seed **não** cria materiais, para a galeria não ficar com imagens quebradas.
Para adicionar: suba os arquivos no **Storage** do Supabase (bucket público
`materials`), copie a URL pública e insira em `marketing_materials` com as
dimensões reais do arquivo. Há um exemplo comentado no fim de `seed.sql`.

## Fechamento mensal

`fn_close_month` calcula ativação e graduação. **Precisa rodar uma vez por mês** —
pelo botão em `/admin/usuarios` ou agendada (veja *Operação*, no fim).

---

# Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `'git' não é reconhecido` | Git não instalado | Instale e **abra um terminal novo** (o PATH só atualiza em janelas novas) |
| `relation "public.users" does not exist` | SQL não aplicado | Refaça o Passo 4 na ordem |
| Erro citando `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` ausente ou incompleto | Passo 5. Reinicie o `npm run dev` depois de editar |
| Loja vazia | Seed não rodou, ou produtos inativos | `select count(*) from public.products;` |
| `/admin` dá 404 | Usuário não é admin | Se não foi o primeiro cadastro, promova conforme o Passo 7 |
| `Link de indicação inválido` no cadastro | O `?ref=` do link aponta para um usuário que não existe | Cadastre-se sem o `?ref=`, ou confirme o link com quem indicou |
| Cadastro some sem erro e volta ao login | Confirmação de e-mail ativa no Supabase | **Authentication** → **Providers** → **Email**: desligue *Confirm email*, ou confirme pelo e-mail recebido |
| Funciona local, quebra na Vercel | Variáveis não estavam no build | Confira as três e faça **Redeploy** |
| `404` em `/rest/v1/auth/v1/signup` no console | `NEXT_PUBLIC_SUPABASE_URL` com `/rest/v1` no final | Deixe só `https://seu-projeto.supabase.co` e reinicie o `npm run dev` |
| E-mail de confirmação leva a `localhost` | URLs do Auth não configuradas | Passo 4 da Vercel |
| `npm ci` falha com `EUSAGE` | `package-lock.json` fora de sincronia | `rm -rf node_modules && npm install` |

---

## Estrutura

```
supabase/
  migrations/
    ...100_schema.sql        tabelas, enums, índices
    ...200_functions.sql     rede, pontuação, fechamento mensal
    ...300_rls.sql           policies, trigger de signup, grants
    ...400_admin_views.sql   views e RPCs do painel admin
    ...500_store.sql         loja: clientes, produtos, pedidos
    ...600_branding.sql      nome e logos configuráveis
  seed.sql                   ranks, prêmios e produtos de exemplo
src/
  app/
    (app)/                   área do afiliado (layout com nav inferior)
      dashboard/ vendas/ pedidos/ rede/ materiais/
    admin/                   área do Super Admin
      pedidos/ produtos/ cancelamentos/ usuarios/ premios/ configuracoes/
    loja/                    vitrine pública, /loja e /loja/[ref]
    cliente/                 cadastro e pedidos do cliente final
    login/ cadastro/
    page.tsx                 roteia por papel: admin, afiliado ou cliente
  components/
    ui/ dashboard/ vendas/ rede/ materiais/ loja/ admin/ auth/
  lib/
    supabase/                clients browser/server/middleware
    actions/                 server actions (sales, prizes, admin, store)
    types.ts utils.ts
```

## Regras de negócio

### Rede

Lateralidade infinita (`sponsor_id` sem limite de largura) e **5 níveis** para
cálculo de pontos (`settings.max_network_levels`). Um trigger impede ciclos no
`sponsor_id` — sem isso os CTEs recursivos travariam.

### Pontuação

| Origem | Peso | Onde |
|---|---|---|
| Venda de produto | 1x | `settings.sale_multiplier` |
| Recrutamento de afiliado | 3x | `settings.recruitment_multiplier` |

`points_ledger` é append-only: cada linha guarda origem, multiplicador, nível e
quem gerou o evento. Cancelamentos entram como linha negativa (`is_reversal`),
preservando a auditoria. `lifetime_points` é derivado do ledger por trigger.

### Compressão dinâmica

`get_compressed_upline` / `get_compressed_downline` usam CTE recursivo em que o
nível efetivo **só incrementa em nós ativos**. Um patrocinador inativo é pulado
sem consumir nível, então a linha ascendente continua recebendo até o 5º nível
válido.

Exemplo verificado (`C` inativo):

```
A -> B -> C(inativo) -> D -> E -> F -> G
```

Uma venda de `G` credita `F=1, E=2, D=3, B=4, A=5`. `A` está na profundidade
real 6 e ainda assim recebe; `C` não recebe nada.

### Ativação e inatividade

O admin define `settings.min_products_monthly`. `fn_close_month` fecha o
período: quem não bate a meta acumula `inactive_streak`; **3 meses consecutivos**
marcam `is_inactive = true`. Com 2 meses o afiliado aparece em
`v_users_at_risk` e vê um alerta âmbar no painel.

### Manutenção de graduação

`ranks.maintenance_points` define a meta mensal. O 1º mês abaixo dela apenas
consome o **grace period**; o 2º mês consecutivo rebaixa um nível
(`rank_order - 1`).

### Código do afiliado

O cadastro pede apenas **nome, e-mail e senha**. O código do afiliado
(`username`) é gerado no banco a partir do primeiro nome, por
`fn_generate_username`:

| Nome informado | Código |
|---|---|
| Weverton Miranda | `weverton` |
| José da Silva | `jose` |
| Ângela Cruz | `angela` |
| Weverton Souza (já existe `weverton`) | `weverton3094` |
| Zé | `ze9135` |

Acentos são removidos, maiúsculas normalizadas e o sufixo numérico só entra
quando o nome puro já está em uso. É identificação visual e endereço de link
(`/loja/weverton`) — quem manda na rede é o `id`.

Pedir esse campo no cadastro era uma armadilha: a constraint aceita só
minúsculas sem acento, então digitar o próprio nome era recusado de imediato.

### Cadastro sem link de indicação

Não existe campo para digitar link: o patrocinador vem sempre do `?ref=` e é
resolvido no banco, então ninguém escolhe onde entra na árvore.

Quem chega sem link precisa marcar **"Ninguém me indicou"** — uma confirmação
explícita, para que quem tem link não perca o patrocinador por descuido. O
banco então direciona ao afiliado mais capacitado, por `fn_pick_best_sponsor`:

1. ativo e com pontuação > 0 (ou admin, que numa operação nova é o único)
2. menos indicados diretos — distribui o acompanhamento
3. maior pontuação — entre os igualmente livres, quem produz mais
4. mais antigo — desempate estável

A ordem evita duas armadilhas. Pontuação em primeiro lugar criaria
retroalimentação, já que cada indicação recebida rende pontos de recrutamento
(3x) e manteria a mesma pessoa sempre no topo. Só "menos diretos" entregaria
sempre ao recém-chegado com zero diretos, o menos capacitado de todos.

Cliente da loja é exceção: sem link, o pedido fica como venda da casa.
Atribuí-lo a um afiliado daria comissão de uma venda que ele não fez.

### Cancelamento de venda

O afiliado **nunca** deleta: `request_sale_cancellation` muda o status para
`pendente_cancelamento`. Os pontos só são estornados quando o admin chama
`review_sale_cancellation(id, true)`, que espelha os lançamentos originais em
negativo por toda a linha que recebeu crédito. Recusar devolve a venda a `ativa`.

## Loja integrada

Não há pagamento online: a loja captura o pedido e o admin fecha a venda no
contato.

**Fluxo.** O admin cadastra produtos em `/admin/produtos` (preço em centavos e
`points_value`, quanto a venda injeta na rede). O afiliado compartilha
`/loja/<username>`. O cliente cria conta, monta o carrinho e envia o pedido —
que cai em `/admin/pedidos` com status `novo`. O admin liga ou chama no
WhatsApp (botões prontos na fila), marca `em_contato` e depois **Fechar venda**.

**Fechar venda distribui os pontos.** `close_order` cria uma linha em `sales`
**por item** do pedido, e cada insert dispara o motor de pontos existente
(peso 1x + compressão dinâmica até o 5º nível). Uma linha por item, e não uma
por pedido, porque a ativação mensal conta unidades de produto e os pontos
variam por produto — um único registro agregado quebraria uma das duas contas.

**Cancelar estorna.** Cancelar um pedido já fechado reverte os lançamentos de
todas as vendas geradas e marca as vendas como canceladas. `fn_reverse_sale_points`
é compartilhada com o cancelamento de venda do CRM.

**Clientes ficam em `customers`, não em `users`.** `users` é a árvore de
afiliados e carrega triggers de recrutamento (3x), ciclo mensal e graduação. Um
cliente ali geraria pontos de recrutamento a cada cadastro e entraria no
fechamento mensal. O trigger de signup decide a tabela pelo `role` no metadata.

**Preço e pontos nunca vêm do cliente.** `place_order` recebe apenas
`product_id` e quantidade; totais são calculados a partir do catálogo ativo no
servidor. Produto inativo, carrinho vazio e pedido sem telefone são recusados.

Pedido sem afiliado vinculado (acesso direto a `/loja`) é venda da casa: fecha
normalmente, sem distribuir pontos. A fila do admin avisa isso antes.

## Segurança

RLS ativo em todas as tabelas. O afiliado enxerga **a si mesmo, sua downline
completa e o patrocinador direto** — crossline é bloqueado no banco, não na UI.

Pontos de atenção implementados:

- Policies de `users` não consultam `users` diretamente (causaria
  `infinite recursion detected in policy`); usam helpers `SECURITY DEFINER`
  (`is_admin`, `is_in_downline`, `my_sponsor_id`).
- Colunas sensíveis (`lifetime_points`, `current_rank_id`, `sponsor_id`,
  `is_admin`, flags de ciclo) são protegidas por trigger de imutabilidade para
  requisições que chegam como `authenticated`/`anon`. RPCs `SECURITY DEFINER`
  seguem podendo escrevê-las.
- Escrita em `points_ledger` só por trigger/RPC — nunca pelo cliente.
- `request_prize` valida a pontuação no servidor.
- `/admin` responde 404 para não-admin (não revela a existência da área).

Na loja:

- O cliente vê apenas os próprios pedidos; o afiliado vê apenas os pedidos que
  indicou. A upline **não** vê os dados de contato dos clientes do downline, e
  nenhum afiliado enxerga a tabela `customers` — é PII de terceiro.
- `customers.referred_by` é imutável para o cliente: sem essa trava ele poderia
  se reapontar para outro afiliado e desviar os pontos do pedido.
- Totais do pedido não são graváveis pelo cliente; só as RPCs escrevem.

### Verificação executada

As migrações foram aplicadas em um Postgres 16 real (aplicação limpa e
reexecução idempotente) e 53 asserções de comportamento passaram, sem falhas:

- rede: compressão dinâmica, pesos 1x/3x, bloqueio de ciclo
- ciclo mensal: inatividade após 3 meses, grace period e rebaixamento
- cancelamento em duas etapas com estorno recursivo, sem estorno duplicado
- loja: totais calculados no servidor, produto inativo e carrinho vazio
  recusados, pontos só no fechamento, fechamento duplicado bloqueado,
  cancelamento de pedido fechado estornando a rede
- segurança: crossline invisível (tabelas e RPCs), isolamento entre clientes,
  upline sem acesso a PII, tentativa de escalar para admin, fraude de pontos,
  roubo de atribuição, venda em nome de terceiro e acesso a RPCs de admin

## Materiais de marketing

Regra estrita de renderização: as artes aparecem **exatamente como os arquivos
originais**. `<img>` puro (sem reencode do `next/image`), `object-contain`,
`width`/`height` intrínsecos reservando a proporção e `filter: none`. Nenhum
crop, `cover`, distorção de proporção ou overlay CSS.

## Master switch

`settings.gamification_enabled` oculta barras de progresso, badges de rank e o
botão de prêmio no painel dos afiliados. `settings.theme` (`gold` / `slate` /
`emerald`) troca a paleta via variáveis CSS aplicadas no `<html data-theme>`.

## Operação

`fn_close_month` é a rotina de virada de mês (ativação + graduação). Rode-a uma
vez por mês — pelo botão em `/admin/usuarios` ou agendada via pg_cron:

```sql
select cron.schedule('fechamento-mensal', '0 3 1 * *', $$select public.fn_close_month()$$);
```
