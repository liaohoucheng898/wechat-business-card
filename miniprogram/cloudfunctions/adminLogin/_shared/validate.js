/**
 * 参数校验工具
 */

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

function isValidEmail(email) {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function checkRequired(params, requiredFields) {
  for (const field of requiredFields) {
    const val = params[field]
    if (val === undefined || val === null || val === '') {
      return { valid: false, missing: field }
    }
  }
  return { valid: true, missing: '' }
}

function isValidName(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 20) return false
  return /^[\u4e00-\u9fa5a-zA-Z0-9路]+$/.test(trimmed)
}

function isValidBio(bio) {
  if (!bio) return true
  return typeof bio === 'string' && bio.length <= 100
}

function isValidSmsCode(code) {
  return /^\d{6}$/.test(code)
}

function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(password)
}

function isValidTimeRange(range) {
  return ['week', 'half_month', 'month'].includes(range)
}

function isValidLogType(type) {
  return ['card_view', 'company_intro_click', 'case_click'].includes(type)
}

function isValidShareScene(scene) {
  return ['friend', 'group', 'timeline', 'other'].includes(scene)
}

module.exports = {
  isValidPhone,
  isValidEmail,
  checkRequired,
  isValidName,
  isValidBio,
  isValidSmsCode,
  isValidPassword,
  isValidTimeRange,
  isValidLogType,
  isValidShareScene,
}
