import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql = fs.readFileSync(
  'supabase/migrations/20260730001300_repair_commission_rls.sql',
  'utf8',
)

test('commission repair removes the obsolete generic policy', () => {
  assert.match(sql, /drop policy if exists own_or_admin on public\.commission_ledger/i)
})

test('commission repair authorizes the beneficiary, not a nonexistent user_id', () => {
  assert.match(sql, /beneficiary_id\s*=\s*auth\.uid\(\)/i)
  assert.doesNotMatch(sql, /user_id\s*=\s*auth\.uid\(\)/i)
})
