const assert = require('node:assert/strict')
const path = require('node:path')

const loginSecurityPath = path.resolve(__dirname, '../../miniprogram/cloudfunctions/_shared/login-security.js')

const {
  genericBindingCodeError,
  genericLoginError,
  genericSmsLoginError,
  maskPhone,
} = require(loginSecurityPath)

assert.deepEqual(genericLoginError(), {
  code: 'E0213',
  msg: '账号或密码错误',
})

assert.deepEqual(genericBindingCodeError(), {
  code: 'E0213',
  msg: '手机号或绑定码错误',
})

assert.deepEqual(genericSmsLoginError(), {
  code: 'E0213',
  msg: '账号或验证码错误',
})

assert.equal(maskPhone('13812345678'), '138****5678')
assert.equal(maskPhone('bad-phone'), 'bad-phone')
