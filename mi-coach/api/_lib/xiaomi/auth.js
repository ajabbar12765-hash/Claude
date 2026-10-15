// Node port of the Xiaomi Passport login flow used by Mi Fitness, ported
// from a verified open-source Python reference (mi_fitness_sync.auth.client)
// rather than guessed. Only plain password login is implemented — if the
// account needs a captcha, an SMS/email code, or "approve this device in
// the app" (all real possibilities Xiaomi can throw at any login), this
// throws a clear, typed error instead of silently failing, since none of
// those can be completed by an unattended cron job anyway.

import crypto from 'node:crypto'
import { CookieJar, jarGet, jarPost, readJsonWithSafePrefix } from './http.js'
import { signedNonce } from './crypto.js'

const ACCOUNT_BASE = 'https://account.xiaomi.com'
const SERVICE_ID = 'miothealth'

export class XiaomiAuthError extends Error {
  constructor(message, kind = 'error') {
    super(message)
    this.kind = kind
  }
}

function pick(...values) {
  for (const v of values) if (v !== undefined && v !== null && v !== '') return v
  return null
}

function extensionValue(res, key) {
  const raw = res.headers.get('extension-pragma')
  if (!raw) return null
  try {
    return JSON.parse(raw)[key] ?? null
  } catch {
    return null
  }
}

async function getMetaLoginData(email, deviceId) {
  const jar = new CookieJar({ deviceId, userId: email })
  const res = await jarGet(`${ACCOUNT_BASE}/pass/serviceLogin`, {
    params: { sid: SERVICE_ID, _json: 'true' },
    headers: { Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' },
    jar,
  })
  const payload = await readJsonWithSafePrefix(res)
  if (payload._sign && payload.qs && payload.callback) {
    return { sign: payload._sign, qs: payload.qs, callback: payload.callback }
  }
  throw new XiaomiAuthError('Failed to start Xiaomi login (could not fetch passport meta data).', 'error')
}

function raiseForRequirements(payload) {
  const code = payload.code
  if (payload.notificationUrl) {
    throw new XiaomiAuthError(
      'Xiaomi wants you to approve this sign-in from your phone (a device-trust prompt). This automated sync cannot complete that step — open Mi Fitness on your phone, approve any pending sign-in prompt, then try the sync again.',
      'notification'
    )
  }
  if (code === 87001) {
    throw new XiaomiAuthError('Xiaomi is asking for a captcha on this login. That can only be solved interactively, so automated sync cannot proceed.', 'captcha')
  }
  if (code === 81003) {
    throw new XiaomiAuthError(
      'Xiaomi wants a verification code (SMS/email) for this login. That can only be entered interactively, so automated sync cannot proceed. Try signing into Mi Fitness on your phone once first — that sometimes clears the requirement for a few days.',
      'step2'
    )
  }
}

function raiseForError(payload) {
  const code = payload.code
  if (code === null || code === undefined || code === 0) return
  const message = pick(payload.desc, payload.description, payload.info) || `Xiaomi login failed with code ${code}.`
  throw new XiaomiAuthError(message, 'error')
}

async function followSts(autoLoginUrl, nonce, ssecurity, jar) {
  const clientSign = crypto.createHash('sha1').update(`nonce=${nonce}&${ssecurity}`, 'utf8').digest('base64')
  const res = await jarGet(autoLoginUrl, { params: { clientSign, _userIdNeedEncrypt: 'true' }, jar })
  return res
}

export async function loginWithPassword({ email, password, deviceId }) {
  const meta = await getMetaLoginData(email, deviceId)
  const jar = new CookieJar({ deviceId })

  const res = await jarPost(`${ACCOUNT_BASE}/pass/serviceLoginAuth2`, {
    form: {
      user: email,
      hash: crypto.createHash('md5').update(password, 'utf8').digest('hex').toUpperCase(),
      sid: SERVICE_ID,
      _json: 'true',
      _sign: meta.sign,
      qs: meta.qs,
      callback: meta.callback,
    },
    headers: { Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' },
    jar,
  })
  const payload = await readJsonWithSafePrefix(res)
  raiseForRequirements(payload)
  raiseForError(payload)

  const userId = pick(payload.userId, email)
  const passToken = pick(payload.passToken, jar.get('passToken'))
  const cUserId = pick(payload.cUserId, jar.get('cUserId'))
  const ssecurity = pick(payload.ssecurity, extensionValue(res, 'ssecurity'))
  const nonce = pick(payload.nonce, extensionValue(res, 'nonce'))
  const autoLoginUrl = payload.location

  if (!passToken) throw new XiaomiAuthError('Xiaomi login response did not include a passToken.', 'error')
  if (!cUserId) throw new XiaomiAuthError('Xiaomi login response did not include cUserId.', 'error')
  if (!ssecurity || !nonce) throw new XiaomiAuthError('Xiaomi login response did not include ssecurity/nonce.', 'error')
  if (!autoLoginUrl) throw new XiaomiAuthError('Xiaomi login response did not include an STS location URL.', 'error')

  const stsRes = await followSts(autoLoginUrl, String(nonce), ssecurity, jar)
  const serviceToken = jar.get(`${SERVICE_ID}_serviceToken`) || jar.get('serviceToken')
  if (!serviceToken) {
    throw new XiaomiAuthError('Xiaomi login completed but no serviceToken was issued — the sign-in did not fully succeed.', 'error')
  }

  return {
    email,
    userId,
    cUserId,
    serviceToken,
    ssecurity,
    passToken,
    deviceId,
    cookieHeader: jar.header(),
  }
}
