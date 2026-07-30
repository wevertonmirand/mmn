import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql = fs.readFileSync(
  'supabase/migrations/20260730001100_affiliate_username.sql',
  'utf8',
)

test('availability ignores the authenticated user current name', () => {
  assert.match(sql, /id <> auth\.uid\(\)/)
})

test('change validates the public link format', () => {
  assert.match(sql, /\^\[a-z0-9\._-\]\{3,30\}\$/)
})

test('concurrent changes are protected by the unique constraint', () => {
  assert.match(sql, /when unique_violation/)
})

test('only authenticated users receive RPC permission', () => {
  assert.match(sql, /revoke all on function public\.change_my_username\(text\) from public/)
  assert.match(sql, /grant execute on function public\.change_my_username\(text\) to authenticated/)
})
