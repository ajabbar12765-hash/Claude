import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { api } from './api.js'

export async function registerThisDevice(deviceName) {
  const options = await api.passkeyRegisterOptions()
  const response = await startRegistration({ optionsJSON: options })
  return api.passkeyRegisterVerify(response, deviceName)
}

export async function signInWithPasskey() {
  const options = await api.passkeyLoginOptions()
  const response = await startAuthentication({ optionsJSON: options })
  return api.passkeyLoginVerify(response)
}
