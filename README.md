# Plataforma de Afiliados (Unilevel)

Next.js 14 + Supabase. Rede unilevel com lateralidade infinita, 5 níveis de
pontuação, compressão dinâmica, painel do afiliado mobile-first (PWA) e painel
administrativo restrito.

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **Supabase** (Postgres + Auth + RLS)
- **Tailwind CSS** — design system branco e dourado (`#D4AF37`)

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha URL e anon key do Supabase
npm run dev
```

Aplicar o banco:

```bash
supabase db reset            # roda migrations + seed
```

Depois de criar seu usuário no Auth, promova-o a administrador:

```sql
update public.users set is_admin = true where username = 'seu_usuario';
```

## Estrutura

```
supabase/
  migrations/
    ...100_schema.sql        tabelas, enums, índices
    ...200_functions.sql     rede, pontuação, fechamento mensal
    ...300_rls.sql           policies, trigger de signup, grants
    ...400_admin_views.sql   views e RPCs do painel admin
    ...500_store.sql         loja: clientes, produtos, pedidos
  seed.sql                   ranks, prêmios, materiais e produtos
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
reexecução idempotente) e 44 asserções de comportamento passaram, sem falhas:

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
