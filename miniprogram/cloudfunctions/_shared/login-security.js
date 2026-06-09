const { E0213 } = require('./error-codes')

function maskPhone(phone = '') {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

function genericLoginError() {
  return { code: E0213.code, msg: E0213.msg }
}

function genericBindingCodeError() {
  return { code: E0213.code, msg: '手机号或绑定码错误' }
}

function genericSmsLoginError() {
  return { code: E0213.code, msg: '账号或验证码错误' }
}

function logPreAuthReject(context, reason, phone) {
  console.warn(`[${context}] pre-auth rejected: ${reason}; phone=${maskPhone(phone)}`)
}

module.exports = {
  genericLoginError,
  genericBindingCodeError,
  genericSmsLoginError,
  logPreAuthReject,
  maskPhone,
}
