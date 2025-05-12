import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatKobo, koboToNairaString, parseNairaToKobo, percentOf } from '../src/lib/money.js'

describe('money helpers', () => {
  it('formats kobo as naira', () => {
    assert.equal(formatKobo(1_250_000), '₦12,500.00')
    assert.equal(formatKobo(5), '₦0.05')
  })

  it('writes CSV friendly amounts', () => {
    assert.equal(koboToNairaString(1_250_050), '12500.50')
  })

  it('parses what staff type', () => {
    assert.equal(parseNairaToKobo('12,500.50'), 1_250_050)
    assert.equal(parseNairaToKobo('₦2500'), 250_000)
    assert.equal(parseNairaToKobo('NGN 40'), 4_000)
    assert.equal(parseNairaToKobo('12.345'), null)
    assert.equal(parseNairaToKobo('abc'), null)
  })

  it('rounds percentages to the nearest kobo', () => {
    assert.equal(percentOf(999, 10), 100)
    assert.equal(percentOf(1_000_000, 7.5), 75_000)
  })
})
