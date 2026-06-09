const crypto = require('crypto')

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

function hashSessionToken(sessionToken = '') {
  return crypto.createHash('sha256').update(String(sessionToken)).digest('hex')
}

function buildSessionFields(sessionToken, openid, sessionExpireAt) {
  return {
    sessionToken: null,
    sessionTokenHash: hashSessionToken(sessionToken),
    sessionOpenid: String(openid || '').trim(),
    sessionExpireAt,
  }
}

function clearSessionFields() {
  return {
    sessionToken: null,
    sessionTokenHash: null,
    sessionOpenid: null,
    sessionExpireAt: null,
    pcSessionToken: null,
    pcSessionExpireAt: null,
  }
}

module.exports = {
  generateSessionToken,
  hashSessionToken,
  buildSessionFields,
  clearSessionFields,
}
