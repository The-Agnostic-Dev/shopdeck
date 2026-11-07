import assert from 'node:assert/strict'
import test from 'node:test'

// Manual QA for the React-only selection reset (the repo has no React test runner):
// 1. Set Status to Pending and tick the first order.
// 2. Set Status to Confirmed and tick the first order in that list.
// 3. Click "Cancel orders" and confirm: the bulk bar shows 1 selected, only the
//    confirmed order is cancelled, and only its customer receives an email.

// filterParams lives outside the API tsconfig rootDir, so importing it statically
// would pull a web file into the API TypeScript program. Load the real helper by
// computed file URL at runtime instead.
const filterParamsUrl = new URL('../../web/src/features/orders/filterParams.ts', import.meta.url).href
const { applyFilterPatch, KEYS } = (await import(filterParamsUrl)) as {
  applyFilterPatch: (prev: URLSearchParams, patch: Record<string, string>) => URLSearchParams
  KEYS: string[]
}

test('changing the status filter from page 5 drops the page param', () => {
  const prev = new URLSearchParams('page=5')
  const next = applyFilterPatch(prev, { status: 'cancelled' })
  assert.equal(next.get('status'), 'cancelled')
  assert.equal(next.get('page'), null)
  assert.equal(prev.get('page'), '5')
})

test('clearing a filter removes its key and restarts at page 1', () => {
  const prev = new URLSearchParams('page=3&status=cancelled&q=rice')
  const next = applyFilterPatch(prev, { status: '', q: '' })
  assert.equal(next.get('status'), null)
  assert.equal(next.get('q'), null)
  assert.equal(next.get('page'), null)
})

test('applying every filter key sets it and drops the page param', () => {
  const prev = new URLSearchParams('page=4')
  const patch = Object.fromEntries(KEYS.map((key) => [key, `${key}-value`]))
  const next = applyFilterPatch(prev, patch)
  for (const key of KEYS) {
    assert.equal(next.get(key), `${key}-value`)
  }
  assert.equal(next.get('page'), null)
  assert.equal(prev.get('page'), '4')
})

test('non-filter params survive a filter change', () => {
  const prev = new URLSearchParams('page=5&order=42&q=rice')
  const next = applyFilterPatch(prev, { status: 'confirmed' })
  assert.equal(next.get('order'), '42')
  assert.equal(next.get('q'), 'rice')
  assert.equal(next.get('status'), 'confirmed')
  assert.equal(next.get('page'), null)
})
