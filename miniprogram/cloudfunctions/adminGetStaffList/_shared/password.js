const crypto = require('crypto')

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/

function randomHex(size = 16) {
  return crypto.randomBytes(size).toString('hex')
}

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey.toString('hex'))
    })
  })
}

function isValidPassword(password) {
  return typeof password === 'string' && PASSWORD_REGEX.test(password)
}

function getPasswordStatus(staff = {}) {
  if (!staff || typeof staff !== 'object') {
    return 'unset'
  }

  if (staff.passwordStatus === 'temporary' || staff.mustChangePassword) {
    return 'temporary'
  }

  if (staff.passwordStatus === 'active') {
    return 'active'
  }

  if (staff.passwordHash) {
    return staff.mustChangePassword ? 'temporary' : 'active'
  }

  return 'unset'
}

async function buildPasswordFields(password, options = {}) {
  const { temporary = false } = options
  const passwordSalt = randomHex(16)
  const passwordHash = await scryptAsync(password, passwordSalt)

  return {
    passwordHash,
    passwordSalt,
    passwordStatus: temporary ? 'temporary' : 'active',
    mustChangePassword: temporary,
    passwordErrorCount: 0,
    passwordLockUntil: null,
  }
}

async function verifyPassword(password, staff = {}) {
  if (!password || !staff.passwordHash || !staff.passwordSalt) {
    return false
  }

  const hash = await scryptAsync(password, staff.passwordSalt)
  return hash === staff.passwordHash
}

function generateTempPassword(length = 8) {
  const minLength = Math.max(length, 8)
  let password = ''

  while (password.length < minLength) {
    const byte = crypto.randomBytes(1)[0]
    password += TEMP_PASSWORD_CHARS[byte % TEMP_PASSWORD_CHARS.length]
  }

  if (!/[A-Za-z]/.test(password)) {
    return generateTempPassword(length)
  }

  if (!/\d/.test(password)) {
    return generateTempPassword(length)
  }

  return password.slice(0, minLength)
}

module.exports = {
  buildPasswordFields,
  generateTempPassword,
  getPasswordStatus,
  isValidPassword,
  verifyPassword,
}
