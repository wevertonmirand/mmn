import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql = fs.readFileSync(
  'supabase/migrations/20260730001200_refresh_commerce_schema.sql',
  'utf8',
)

test('repair migration guarantees every commission column', () => {
  for (let level = 1; level <= 5; level += 1) {
    assert.match(sql, new RegExp(`add column if not exists commission_level_${level}`))
  }
})

test('repair migration reloads PostgREST schema cache', () => {
  assert.match(sql, /notify pgrst, 'reload schema'/i)
})
