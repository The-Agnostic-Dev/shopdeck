import assert from 'node:assert/strict'
import test from 'node:test'
import { applyFilterPatch } from '../../web/src/features/orders/filterParams.js'

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

test('non-filter params survive a filter change', () => {
  const prev = new URLSearchParams('page=5&order=42&q=rice')
  const next = applyFilterPatch(prev, { status: 'confirmed' })
  assert.equal(next.get('order'), '42')
  assert.equal(next.get('q'), 'rice')
  assert.equal(next.get('status'), 'confirmed')
  assert.equal(next.get('page'), null)
})
