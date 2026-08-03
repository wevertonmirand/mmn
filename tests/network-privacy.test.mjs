import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql = fs.readFileSync('supabase/migrations/20260730001600_network_privacy.sql', 'utf8')

/** Corpo de uma função da migração, entre o `create ... as $$` e o `$$;`. */
function bodyOf(name) {
  const start = sql.indexOf(`function public.${name}(`)
  assert.notEqual(start, -1, `função ${name} não encontrada`)
  const open = sql.indexOf('as $$', start)
  const close = sql.indexOf('$$;', open)
  assert.ok(open !== -1 && close !== -1, `corpo de ${name} não delimitado`)
  return sql.slice(open, close)
}

test('a política permissiva da downline é removida e não volta', () => {
  assert.match(sql, /drop policy if exists users_select_downline on public\.users/)
  assert.doesNotMatch(sql, /create policy users_select_downline/)
})

test('vendas e atividade da downline ficam limitadas a 5 níveis', () => {
  for (const policy of ['sales_select_downline', 'activity_select_downline']) {
    const at = sql.indexOf(`create policy ${policy}`)
    assert.notEqual(at, -1, `${policy} não recriada`)
    assert.match(
      sql.slice(at, at + 300),
      /downline_depth\(auth\.uid\(\), user_id\) between 1 and 5/,
      `${policy} deveria cortar em 5 níveis`,
    )
  }
})

test('revogações incluem PUBLIC — sem isso o revoke é no-op', () => {
  // Toda função nasce com EXECUTE para PUBLIC; revogar só de `authenticated`
  // não fecha nada, porque o privilégio continua vindo por PUBLIC.
  const internas = [
    'fn_distribute_points',
    'fn_reverse_sale_points',
    'fn_close_internal_order',
    'fn_close_customer_order',
    'fn_downline_counts',
    'get_compressed_downline',
    'get_compressed_upline',
    'get_full_downline',
  ]

  for (const fn of internas) {
    const line = sql
      .split('\n')
      .find((l) => l.startsWith('revoke execute') && l.includes(`public.${fn}(`))
    assert.ok(line, `faltou revogar ${fn}`)
    assert.match(line, /from public\b/, `${fn} precisa ser revogada de PUBLIC`)
  }
})

test('a RPC do afiliado barra crossline e para no 5º nível', () => {
  const body = bodyOf('get_my_network_children')
  assert.match(body, /if v_depth is null or v_depth >= 5 then/)
  // no 5º nível o chevron nunca acende: a existência do 6º não vaza
  assert.match(body, /case when v_child_depth < 5/)
})

test('a RPC do afiliado só entrega dados sensíveis no nível 1', () => {
  const body = bodyOf('get_my_network_children')
  const select = body.slice(body.indexOf('select\n    p.id,'))

  for (const col of ['username', 'phone', 'is_inactive', 'lifetime_points', 'joined_at']) {
    assert.match(
      select,
      new RegExp(`case when v_child_depth = 1 then p\\.${col} end`),
      `${col} deveria ser redigida fora do nível 1`,
    )
    // e nunca selecionada crua
    assert.doesNotMatch(
      select,
      new RegExp(`^\\s*p\\.${col},`, 'm'),
      `${col} não pode ser selecionada sem redação`,
    )
  }
})

test('as RPCs de admin exigem admin', () => {
  for (const fn of ['get_admin_network_children', 'search_network']) {
    assert.match(bodyOf(fn), /if not public\.is_admin\(\) then\s*\n?\s*raise exception/)
  }
})

test('a busca ignora termos curtos, para não varrer a base', () => {
  assert.match(bodyOf('search_network'), /if length\(v_term\) < 2 then/)
})

test('a rede do dashboard passa a contar só 5 níveis', () => {
  const at = sql.indexOf('network_size as (')
  assert.notEqual(at, -1)
  assert.match(sql.slice(at, at + 300), /where d\.depth <= 5/)
})

test('a migração recarrega o cache do PostgREST', () => {
  assert.match(sql, /notify pgrst, 'reload schema'/i)
})
