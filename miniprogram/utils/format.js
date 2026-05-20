/**
 * 格式化工具
 */

/**
 * 手机号脱敏 138****1234
 */
function maskPhone(phone) {
  if (!phone || phone.length < 11) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

/**
 * 日期格式化
 * @param {number|Date|string} date 
 * @param {string} fmt 格式 默认 'YYYY-MM-DD'
 */
function formatDate(date, fmt = 'YYYY-MM-DD') {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const map = {
    YYYY: d.getFullYear(),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    DD: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
    ss: String(d.getSeconds()).padStart(2, '0')
  }
  let result = fmt
  Object.keys(map).forEach(key => {
    result = result.replace(key, map[key])
  })
  return result
}

/**
 * 数字格式化（超过万显示 x.x万）
 */
function formatNumber(num) {
  if (!num && num !== 0) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return String(num)
}

/**
 * 校验手机号
 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 校验邮箱
 */
function isValidEmail(email) {
  if (!email) return true // 非必填
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 校验密码
 */
function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(password)
}

module.exports = {
  maskPhone,
  formatDate,
  formatNumber,
  isValidPhone,
  isValidEmail,
  isValidPassword
}
