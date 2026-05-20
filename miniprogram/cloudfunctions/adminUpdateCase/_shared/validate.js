/**
 * 参数校验工具
 */

/**
 * 校验手机号格式（中国大陆11位）
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 校验邮箱格式
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email) return true // 选填
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 校验必填字段
 * @param {object} params 参数对象
 * @param {string[]} requiredFields 必填字段名列表
 * @returns {{ valid: boolean, missing: string }} valid=false 时 missing 为缺失字段名
 */
function checkRequired(params, requiredFields) {
  for (const field of requiredFields) {
    const val = params[field]
    if (val === undefined || val === null || val === '') {
      return { valid: false, missing: field }
    }
  }
  return { valid: true, missing: '' }
}

/**
 * 校验姓名（2-20字，中英文数字·）
 * @param {string} name
 * @returns {boolean}
 */
function isValidName(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 20) return false
  return /^[\u4e00-\u9fa5a-zA-Z0-9·]+$/.test(trimmed)
}

/**
 * 校验个人简介（≤100字）
 * @param {string} bio
 * @returns {boolean}
 */
function isValidBio(bio) {
  if (!bio) return true // 选填
  return typeof bio === 'string' && bio.length <= 100
}

/**
 * 校验6位短信验证码
 * @param {string} code
 * @returns {boolean}
 */
function isValidSmsCode(code) {
  return /^\d{6}$/.test(code)
}

/**
 * 校验 timeRange 枚举
 * @param {string} range
 * @returns {boolean}
 */
function isValidTimeRange(range) {
  return ['week', 'half_month', 'month'].includes(range)
}

/**
 * 校验 logType 枚举
 * @param {string} type
 * @returns {boolean}
 */
function isValidLogType(type) {
  return ['card_view', 'company_intro_click', 'case_click'].includes(type)
}

/**
 * 校验 shareScene 枚举
 * @param {string} scene
 * @returns {boolean}
 */
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
  isValidTimeRange,
  isValidLogType,
  isValidShareScene,
}
