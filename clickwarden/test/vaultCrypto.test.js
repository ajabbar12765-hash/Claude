import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveKey, encryptVault, decryptVault } from '../src/lib/vaultCrypto.js'

test('encrypt then decrypt round-trips the entries', async () => {
  const entries = [{ id: '1', title: 'Example', username: 'me', password: 'hunter2', url: '', notes: '' }]
  const { key, saltB64 } = await deriveKey('correct horse battery staple')
  const { iv, ciphertext } = await encryptVault(key, entries)

  const { key: key2 } = await deriveKey('correct horse battery staple', saltB64)
  const decrypted = await decryptVault(key2, iv, ciphertext)
  assert.deepEqual(decrypted, entries)
})

test('wrong master password fails to decrypt instead of returning garbage', async () => {
  const entries = [{ id: '1', title: 'Example', username: 'me', password: 'hunter2', url: '', notes: '' }]
  const { key, saltB64 } = await deriveKey('correct horse battery staple')
  const { iv, ciphertext } = await encryptVault(key, entries)

  const { key: wrongKey } = await deriveKey('totally different password', saltB64)
  await assert.rejects(() => decryptVault(wrongKey, iv, ciphertext))
})

test('same salt is reused across unlocks, not regenerated', async () => {
  const { saltB64: salt1 } = await deriveKey('a password')
  const { saltB64: salt2 } = await deriveKey('a password', salt1)
  assert.equal(salt1, salt2)
})
