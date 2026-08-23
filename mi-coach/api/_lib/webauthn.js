// Device-lock via passkeys (WebAuthn), on top of @simplewebauthn/server.
//
// Why: a shared password can be typed in from any device. A passkey is
// bound to one device's secure hardware (Face ID / Touch ID / Windows
// Hello / a security key) — the private key never leaves the device, so
// only devices that were explicitly enrolled can ever sign in once this is
// turned on. Enrollment happens from inside the app (see api/auth/passkey/
// register-*.js), gated by an existing session.
//
// The RP ID / origin are derived from the request host rather than
// hardcoded, so this keeps working across preview URLs and custom domains
// without extra config.

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { readJSON, writeJSON, PASSKEY_KEY, WEBAUTHN_CHALLENGE_KEY } from './store.js'

const RP_NAME = 'Mi Coach'

export function rpConfig(req) {
  const host = req.headers.host || ''
  const rpID = host.split(':')[0]
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const origin = `${proto}://${host}`
  return { rpID, origin }
}

export async function listPasskeys() {
  const store = await readJSON(PASSKEY_KEY, { credentials: [] })
  return store.credentials || []
}

async function savePasskeys(credentials) {
  await writeJSON(PASSKEY_KEY, { credentials })
}

export async function passkeysEnabled() {
  const list = await listPasskeys()
  return list.length > 0
}

async function setChallenge(purpose, challenge) {
  await writeJSON(WEBAUTHN_CHALLENGE_KEY, { purpose, challenge, at: Date.now() })
}

async function consumeChallenge(purpose) {
  const stored = await readJSON(WEBAUTHN_CHALLENGE_KEY, null)
  if (!stored || stored.purpose !== purpose) return null
  // Challenges are single-use and short-lived (5 min) — this is a
  // single-user app, so a shared "current challenge" slot is enough.
  if (Date.now() - stored.at > 5 * 60 * 1000) return null
  return stored.challenge
}

export async function buildRegistrationOptions(req, { userName }) {
  const { rpID } = rpConfig(req)
  const existing = await listPasskeys()
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  })
  await setChallenge('register', options.challenge)
  return options
}

export async function verifyRegistration(req, { response, deviceName }) {
  const { rpID, origin } = rpConfig(req)
  const expectedChallenge = await consumeChallenge('register')
  if (!expectedChallenge) {
    const err = new Error('Registration expired — try adding the device again.')
    err.statusCode = 400
    throw err
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  })

  if (!verification.verified || !verification.registrationInfo) {
    const err = new Error('Could not verify this device.')
    err.statusCode = 400
    throw err
  }

  const { credential } = verification.registrationInfo
  const existing = await listPasskeys()
  existing.push({
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: credential.transports || [],
    deviceName: deviceName?.slice(0, 60) || 'Unnamed device',
    createdAt: new Date().toISOString(),
  })
  await savePasskeys(existing)
  return { ok: true }
}

export async function buildAuthenticationOptions(req) {
  const { rpID } = rpConfig(req)
  const existing = await listPasskeys()
  if (existing.length === 0) {
    const err = new Error('No devices are registered yet.')
    err.statusCode = 400
    throw err
  }
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: existing.map((c) => ({ id: c.id, transports: c.transports })),
    userVerification: 'preferred',
  })
  await setChallenge('login', options.challenge)
  return options
}

export async function verifyAuthentication(req, { response }) {
  const { rpID, origin } = rpConfig(req)
  const expectedChallenge = await consumeChallenge('login')
  if (!expectedChallenge) {
    const err = new Error('Sign-in expired — try again.')
    err.statusCode = 400
    throw err
  }

  const existing = await listPasskeys()
  const match = existing.find((c) => c.id === response.id)
  if (!match) {
    const err = new Error('This device is not registered.')
    err.statusCode = 401
    throw err
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: match.id,
      publicKey: new Uint8Array(Buffer.from(match.publicKey, 'base64')),
      counter: match.counter,
      transports: match.transports,
    },
  })

  if (!verification.verified) {
    const err = new Error('Could not verify this device.')
    err.statusCode = 401
    throw err
  }

  match.counter = verification.authenticationInfo.newCounter
  await savePasskeys(existing)
  return { ok: true }
}

export async function removePasskey(credentialId) {
  const existing = await listPasskeys()
  const next = existing.filter((c) => c.id !== credentialId)
  await savePasskeys(next)
  return next
}

export async function resetPasskeys() {
  await savePasskeys([])
}
