// Node port of Xiaomi's "micloud" request signing scheme, ported line-for-line
// from the reverse-engineered Python reference (mi_fitness_sync.activity.crypto)
// rather than guessed at. RC4 is hand-rolled (not Node's legacy cipher
// provider) because that's what the reference implementation does too —
// Xiaomi's own client uses a plain RC4-drop1024, not a library primitive.

import crypto from 'node:crypto'

function b64d(value) {
  return Buffer.from(value, 'base64')
}

function b64e(buf) {
  return Buffer.from(buf).toString('base64')
}

export function signedNonce(ssecurity, nonce) {
  const digest = crypto.createHash('sha256').update(Buffer.concat([b64d(ssecurity), b64d(nonce)])).digest()
  return b64e(digest)
}

function sha1Signature(parts) {
  const digest = crypto.createHash('sha1').update(parts.join('&'), 'utf8').digest()
  return b64e(digest)
}

class Rc4Cipher {
  constructor(key) {
    if (key.length !== 32) throw new Error('RC4 key must be 32 bytes.')
    this.state = new Uint8Array(256)
    for (let i = 0; i < 256; i++) this.state[i] = i
    let j = 0
    for (let i = 0; i < 256; i++) {
      j = (j + this.state[i] + key[i % key.length]) & 0xff
      ;[this.state[i], this.state[j]] = [this.state[j], this.state[i]]
    }
    this.i = 0
    this.j = 0
    this.apply(Buffer.alloc(1024))
  }

  apply(data) {
    const output = Buffer.from(data)
    for (let index = 0; index < output.length; index++) {
      this.i = (this.i + 1) & 0xff
      const stateI = this.state[this.i]
      this.j = (this.j + stateI) & 0xff
      ;[this.state[this.i], this.state[this.j]] = [this.state[this.j], this.state[this.i]]
      output[index] = output[index] ^ this.state[(this.state[this.i] + stateI) & 0xff]
    }
    return output
  }
}

function uriPath(path) {
  try {
    return new URL(path, 'https://placeholder.invalid').pathname
  } catch {
    return path
  }
}

export function buildSignature(method, path, params, signedNonceValue) {
  const parts = [method.toUpperCase(), uriPath(path)]
  for (const key of Object.keys(params).sort()) parts.push(`${key}=${params[key]}`)
  parts.push(signedNonceValue)
  return sha1Signature(parts)
}

export function generateNonce(timeDiffMs = 0) {
  const random = crypto.randomBytes(8)
  const minuteCounter = Buffer.alloc(4)
  minuteCounter.writeInt32BE(Math.floor((Date.now() + timeDiffMs) / 60000))
  return b64e(Buffer.concat([random, minuteCounter]))
}

export function decryptResponsePayload(body, nonce, ssecurity) {
  const rc4Key = b64d(signedNonce(ssecurity, nonce))
  const decrypted = new Rc4Cipher(rc4Key).apply(b64d(body)).toString('utf8')
  const payload = JSON.parse(decrypted)
  if (typeof payload !== 'object' || payload === null) throw new Error('Mi Fitness response payload was not a JSON object.')
  return payload
}

export function encryptQueryParams({ method, path, params, nonce, ssecurity, signaturePath }) {
  const signedNonceValue = signedNonce(ssecurity, nonce)
  const signatureInput = {}
  for (const [k, v] of Object.entries(params)) if (k && v) signatureInput[k] = v
  signatureInput.rc4_hash__ = buildSignature(method, signaturePath || path, signatureInput, signedNonceValue)

  const cipher = new Rc4Cipher(b64d(signedNonceValue))
  const encryptedParams = {}
  for (const key of Object.keys(signatureInput).sort()) {
    encryptedParams[key] = b64e(cipher.apply(Buffer.from(signatureInput[key], 'utf8')))
  }
  encryptedParams.signature = buildSignature(method, signaturePath || path, encryptedParams, signedNonceValue)
  encryptedParams._nonce = nonce
  return encryptedParams
}
