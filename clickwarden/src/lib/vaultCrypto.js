// All vault crypto happens here, in the browser. ClickWarden's server only
// ever stores what this file produces: opaque salt/iv/ciphertext -- never
// the master password, never a plaintext entry.
export const DEFAULT_ITERATIONS = 250000

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// Pass an existing salt (from the stored blob) to unlock a vault, or omit
// it to create a new one -- either way returns the key plus the salt that
// was actually used, so the caller can persist it alongside new vaults.
export async function deriveKey(masterPassword, existingSaltB64, iterations = DEFAULT_ITERATIONS) {
  const salt = existingSaltB64 ? fromBase64(existingSaltB64) : crypto.getRandomValues(new Uint8Array(16)).buffer
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  return { key, saltB64: toBase64(salt) }
}

export async function encryptVault(key, entries) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(entries))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) }
}

// Wrong master password -> wrong key -> AES-GCM's built-in authentication
// tag check fails and this throws. That failure IS the "wrong password"
// signal; there's no separate check needed.
export async function decryptVault(key, ivB64, ciphertextB64) {
  const iv = new Uint8Array(fromBase64(ivB64))
  const ciphertext = fromBase64(ciphertextB64)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext))
}
