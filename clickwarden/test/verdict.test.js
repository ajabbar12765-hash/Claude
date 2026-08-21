import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateVerdict } from '../api/_lib/verdict.js'

test('malicious wins when any source flags malicious', () => {
  const r = aggregateVerdict({
    virustotal: { status: 'malicious' },
    safeBrowsing: { status: 'clean' },
    urlhaus: { status: 'unknown' },
  })
  assert.equal(r.verdict, 'malicious')
})

test('suspicious wins over clean when nothing is malicious', () => {
  const r = aggregateVerdict({ virustotal: { status: 'suspicious' }, safeBrowsing: { status: 'clean' } })
  assert.equal(r.verdict, 'suspicious')
})

test('safe requires at least one primary source vouching clean', () => {
  const r = aggregateVerdict({ virustotal: { status: 'clean' } })
  assert.equal(r.verdict, 'safe')
})

test('urlhaus alone finding no_results cannot resolve to safe', () => {
  const r = aggregateVerdict({ urlhaus: { status: 'unknown' } })
  assert.equal(r.verdict, 'unknown')
})

test('urlhaus malicious hit still resolves malicious on its own', () => {
  const r = aggregateVerdict({ urlhaus: { status: 'malicious' } })
  assert.equal(r.verdict, 'malicious')
})

test('no sources configured -> unknown with an empty source list', () => {
  const r = aggregateVerdict({})
  assert.equal(r.verdict, 'unknown')
  assert.deepEqual(r.sources, [])
})

test('source errors do not count as clean', () => {
  const r = aggregateVerdict({ virustotal: { status: 'error' }, safeBrowsing: { status: 'error' } })
  assert.equal(r.verdict, 'unknown')
})
