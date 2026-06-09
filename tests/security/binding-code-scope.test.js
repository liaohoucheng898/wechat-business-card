const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const bindWxml = read('miniprogram/pages/bind-phone/index.wxml')
assert.match(bindWxml, /绑定码/, 'mini program binding page should call employee credential binding code')
assert.doesNotMatch(bindWxml, /密码需为|请输入密码|忘记密码|重置密码/, 'mini program binding page should not expose password wording')

const bindJs = read('miniprogram/pages/bind-phone/index.js')
assert.match(bindJs, /手机号和绑定码/, 'mini program binding validation should mention binding code')
assert.match(bindJs, /重新生成绑定码/, 'mini program binding errors should guide admin to regenerate binding code')

const passwordLoginFunction = read('miniprogram/cloudfunctions/passwordLogin/index.js')
assert.match(passwordLoginFunction, /genericBindingCodeError/, 'mini program passwordLogin should use binding-code error wording')
assert.match(passwordLoginFunction, /绑定码需/, 'mini program passwordLogin validation should mention binding code')
assert.match(passwordLoginFunction, /passwordHash:\s*''/, 'binding code should be cleared after successful binding')
assert.match(passwordLoginFunction, /passwordStatus:\s*'active'/, 'binding code status should become active after successful binding')

const staffVue = read('admin/src/views/staff/index.vue')
assert.match(staffVue, /绑定码状态/, 'staff table should show binding code status')
assert.match(staffVue, /重新生成绑定码/, 'staff action should regenerate binding code')
assert.match(staffVue, /复制绑定码/, 'credential dialog should copy binding code')
assert.doesNotMatch(staffVue, />重置密码</, 'staff page should not expose reset password action text')
assert.doesNotMatch(staffVue, /临时密码/, 'employee credential UI should not expose temporary password wording')

const resetFunction = read('miniprogram/cloudfunctions/adminResetPassword/index.js')
assert.match(resetFunction, /bindingCode/, 'reset function should return bindingCode alias')
assert.match(resetFunction, /openid:\s*null/, 'regenerating binding code should clear primary openid')
assert.match(resetFunction, /openids:\s*\[\]/, 'regenerating binding code should clear openids')
assert.match(resetFunction, /wechatBindings:\s*\[\]/, 'regenerating binding code should clear wechat bindings')
assert.match(resetFunction, /clearSessionFields\(\)/, 'regenerating binding code should clear sessions')

const appJs = read('miniprogram/app.js')
assert.doesNotMatch(appJs, /先检查本地是否有有效token/, 'autoLogin must not trust local token before cloud validation')
assert.match(appJs, /auth\.clearSession\(\)/, 'autoLogin should clear stale local session on needBind or login failure')

const myCardJs = read('miniprogram/pages/my-card/index.js')
assert.match(myCardJs, /data\.needBind/, 'my-card sync should detect unbound cloud response')
assert.match(myCardJs, /wx\.reLaunch\(\{\s*url:\s*'\/pages\/bind-phone\/index'\s*\}\)/s, 'my-card should relaunch to binding page when cloud says needBind')
