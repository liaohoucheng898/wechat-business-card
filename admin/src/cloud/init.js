import cloudbase from '@cloudbase/js-sdk'
import { CLOUD_ENV_ID } from '@/config/env'

const app = cloudbase.init({
  env: CLOUD_ENV_ID
})

const auth = app.auth()

export async function signInWithTicket(ticket) {
  const result = await auth.signInWithCustomTicket(async () => ticket)
  if (result?.error) {
    console.error('[cloudAuth] custom login failed:', result.error?.message || String(result.error))
    throw new Error(result.error?.message || 'Custom login failed')
  }
}

export async function signOut() {
  try {
    await auth.signOut()
  } catch (_) {}
}

export default app
