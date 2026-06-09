const crypto = require('crypto')

const DEFAULT_TTL_MS = 30 * 60 * 1000

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
}

function getSecret(options = {}) {
  return String(
    options.secret ||
    process.env.VIEW_LOG_SIGNING_SECRET ||
    process.env.TCB_ENV ||
    process.env.SCF_NAMESPACE ||
    'wechat-card-view-log-signing-secret'
  )
}

function normalizePayload(payload = {}) {
  return {
    staffId: String(payload.staffId || ''),
    companyId: String(payload.companyId || ''),
    logType: String(payload.logType || ''),
    caseId: String(payload.caseId || ''),
  }
}

function signPayload(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function signViewToken(payload = {}, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : DEFAULT_TTL_MS
  const body = {
    ...normalizePayload(payload),
    exp: now + ttlMs,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(body))
  const signature = signPayload(encodedPayload, getSecret(options))
  return `${encodedPayload}.${signature}`
}

function safeEqual(a = '', b = '') {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function verifyViewToken(token = '', expected = {}, options = {}) {
  try {
    const [encodedPayload, signature] = String(token || '').split('.')
    if (!encodedPayload || !signature) {
      return { ok: false, reason: 'malformed' }
    }

    const expectedSignature = signPayload(encodedPayload, getSecret(options))
    if (!safeEqual(signature, expectedSignature)) {
      return { ok: false, reason: 'bad_signature' }
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    const now = Number.isFinite(options.now) ? options.now : Date.now()
    if (!Number.isFinite(payload.exp) || payload.exp < now) {
      return { ok: false, reason: 'expired' }
    }

    const normalizedPayload = normalizePayload(payload)
    const normalizedExpected = normalizePayload(expected)
    const matches = Object.keys(normalizedExpected).every((key) => {
      return normalizedPayload[key] === normalizedExpected[key]
    })

    if (!matches) {
      return { ok: false, reason: 'mismatch' }
    }

    return { ok: true, payload: normalizedPayload }
  } catch (error) {
    return { ok: false, reason: 'invalid' }
  }
}

module.exports = {
  signViewToken,
  verifyViewToken,
}
