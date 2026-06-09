# Binding Code Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将员工端“密码”收口为“绑定码”：员工只用手机号+绑定码完成微信绑定，管理员重新生成绑定码会解除旧微信绑定并清除旧登录态。

**Architecture:** 保留现有 `passwordHash/passwordStatus/adminResetPassword` 内部字段和云函数名，降低数据库迁移风险；对用户界面和业务行为统一为绑定码。后端在重新生成绑定码时清除 session 与微信绑定；小程序启动和“我的名片”页必须以云端 `login` 校验为准，发现未绑定或禁用时清本地缓存并回到绑定页。

**Tech Stack:** 微信小程序原生 JS/WXML、Vue 3 + Element Plus PC 后台、CloudBase 云函数 Node.js、Node.js `assert` 安全回归测试、CloudBase CLI 发布脚本。

---

### Task 1: Binding Code Regression Test

**Files:**
- Create: `tests/security/binding-code-scope.test.js`

- [ ] **Step 1: Write failing static regression test**

Create `tests/security/binding-code-scope.test.js` to assert:

```js
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
```

- [ ] **Step 2: Run and watch it fail**

Run:

```powershell
node tests\security\binding-code-scope.test.js
```

Expected: FAIL before implementation because current UI still uses password wording and `adminResetPassword` does not clear微信绑定。

### Task 2: Backend Binding Code Semantics

**Files:**
- Modify: `miniprogram/cloudfunctions/adminResetPassword/index.js`

- [ ] **Step 1: Regenerate binding code and clear binding**

When updating target staff, keep password-hash storage for compatibility but add:

```js
openid: null,
openids: [],
wechatBindings: [],
...clearSessionFields(),
bindingCodeUpdatedAt: db.serverDate(),
```

- [ ] **Step 2: Return binding-code aliases**

Return:

```js
bindingCode: temporaryPassword,
temporaryPassword,
passwordStatus: 'temporary',
mustChangePassword: true
```

This keeps old front-end fallback compatible while allowing new UI to use `bindingCode`.

### Task 3: Mini Program Cloud Validation

**Files:**
- Modify: `miniprogram/app.js`
- Modify: `miniprogram/pages/my-card/index.js`

- [ ] **Step 1: Make app auto-login validate with cloud first**

Remove the early local-token success branch. `autoLogin()` should call cloud `login` every launch. If cloud returns `needBind`, clear local auth and redirect to `/pages/bind-phone/index` for default entry.

- [ ] **Step 2: Handle stale binding on my-card sync**

In `_syncStaffInfo()`, if `login` returns `needBind` or no `staffInfo`, clear session, clear page state, update app global auth state, and `wx.reLaunch({ url: '/pages/bind-phone/index' })`.

### Task 4: Binding Code UI Wording

**Files:**
- Modify: `miniprogram/pages/bind-phone/index.wxml`
- Modify: `miniprogram/pages/bind-phone/index.js`
- Modify: `admin/src/views/staff/index.vue`
- Modify: `admin/src/cloud/api.js`
- Modify: `admin/src/components/StaffDrawer.vue`

- [ ] **Step 1: Mini program wording**

Change employee-facing wording from password to binding code. Keep JS variable names `password` if changing them would cause unnecessary code churn.

- [ ] **Step 2: PC staff wording**

Change staff-management-facing labels/actions/dialogs from password to binding code. Keep administrator login and administrator password-change wording unchanged.

- [ ] **Step 3: Credential dialog data compatibility**

Use `data.bindingCode || data.temporaryPassword` when showing/copying the code.

### Task 5: Verification And Release

**Files:**
- Test: `tests/security/binding-code-scope.test.js`
- Existing tests: `tests/security/*.test.js`
- Deploy: `adminResetPassword`, `login`
- Build: PC admin static bundle
- Document: `项目文档/发布记录.md`

- [ ] **Step 1: Run verification**

Run:

```powershell
node tests\security\binding-code-scope.test.js
node tests\security\mini-auth-scope.test.js
node tests\security\session-auth.test.js
node tests\security\login-security.test.js
node tests\security\login-lockout.test.js
node --check miniprogram\app.js
node --check miniprogram\pages\my-card\index.js
node --check miniprogram\pages\bind-phone\index.js
node --check miniprogram\cloudfunctions\adminResetPassword\index.js
```

- [ ] **Step 2: Build PC admin**

Run:

```powershell
cmd /c npm run cb:build:admin
```

- [ ] **Step 3: Deploy backend and PC admin**

Deploy cloud functions:

```powershell
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy-cloudfunctions.ps1' -Names adminResetPassword,login"
```

Deploy admin hosting if build succeeds:

```powershell
powershell -ExecutionPolicy Bypass -File '.\scripts\deploy-admin-hosting.ps1'
```

- [ ] **Step 4: Document release**

Append segmented release record with backup path `backups/binding-code-scope-20260609-131325` and note that mini program source changes require a later微信开发者工具上传才 reach production clients.
