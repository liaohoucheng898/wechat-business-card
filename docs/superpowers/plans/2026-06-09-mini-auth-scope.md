# Mini Program Auth Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口员工端账号能力：小程序只保留首次手机号+密码绑定微信，员工端不再提供或支持自助修改密码；PC 后台管理员改密能力继续保留。

**Architecture:** 前端层从 `miniprogram/app.json` 移除 `pages/change-password/index` 路由，避免小程序包继续暴露员工改密页面。后端层在 `changePassword` 云函数中拒绝携带 `sessionToken` 的小程序员工调用，但保留 PC 后台通过 CloudBase Custom Login 调用的管理员改密链路。

**Tech Stack:** 微信小程序原生页面配置、CloudBase 云函数 Node.js、Node.js `assert` 测试、现有 `scripts/deploy-cloudfunctions.ps1` 发布脚本。

---

### Task 1: Add Security Regression Test

**Files:**
- Create: `tests/security/mini-auth-scope.test.js`
- Read: `miniprogram/app.json`
- Read: `miniprogram/cloudfunctions/changePassword/index.js`

- [ ] **Step 1: Write the failing test**

Create `tests/security/mini-auth-scope.test.js`:

```js
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')

const appJson = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram/app.json'), 'utf8'))
assert.equal(
  appJson.pages.includes('pages/change-password/index'),
  false,
  'mini program must not expose employee self-service password change page'
)

const changePasswordSource = fs.readFileSync(
  path.join(root, 'miniprogram/cloudfunctions/changePassword/index.js'),
  'utf8'
)

assert.match(
  changePasswordSource,
  /if\s*\(\s*event\.sessionToken\s*\)\s*{\s*return\s+{\s*error:\s*E0208\s*}\s*}/s,
  'changePassword must reject mini-program sessionToken calls'
)

assert.match(
  changePasswordSource,
  /const\s+{\s*customUserId:\s*staffId\s*}\s*=\s*tcbAuth\.getUserInfo\(\)/,
  'changePassword must keep PC admin custom-login password change path'
)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node tests\security\mini-auth-scope.test.js
```

Expected before implementation: FAIL because `miniprogram/app.json` still includes `pages/change-password/index` and `changePassword` still accepts `event.sessionToken`.

### Task 2: Remove Mini Program Change Password Route

**Files:**
- Modify: `miniprogram/app.json`

- [ ] **Step 1: Remove the route**

Change the `pages` array from:

```json
[
  "pages/my-card/index",
  "pages/card/index",
  "pages/case-detail/index",
  "pages/card-disabled/index",
  "pages/bind-phone/index",
  "pages/change-password/index",
  "pages/edit-card/index",
  "pages/my-stats/index"
]
```

to:

```json
[
  "pages/my-card/index",
  "pages/card/index",
  "pages/case-detail/index",
  "pages/card-disabled/index",
  "pages/bind-phone/index",
  "pages/edit-card/index",
  "pages/my-stats/index"
]
```

- [ ] **Step 2: Run JSON validation**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('miniprogram/app.json','utf8')); console.log('app.json ok')"
```

Expected: `app.json ok`

### Task 3: Reject Mini Program Employee Password Change Calls

**Files:**
- Modify: `miniprogram/cloudfunctions/changePassword/index.js`

- [ ] **Step 1: Change mini program token branch**

Replace this branch in `resolveCurrentStaff(event)`:

```js
if (event.sessionToken) {
  const tokenResult = await verifyToken(event.sessionToken)
  if (tokenResult.error) {
    return { error: tokenResult.error }
  }
  return { staffInfo: tokenResult.staffInfo }
}
```

with:

```js
if (event.sessionToken) {
  return { error: E0208 }
}
```

- [ ] **Step 2: Remove unused import**

Change:

```js
const { verifyToken, verifyAdminByStaffId } = require('./_shared/auth')
```

to:

```js
const { verifyAdminByStaffId } = require('./_shared/auth')
```

- [ ] **Step 3: Run syntax check**

Run:

```powershell
node --check miniprogram\cloudfunctions\changePassword\index.js
```

Expected: exit code 0, no syntax error.

### Task 4: Verify Local Behavior

**Files:**
- Test: `tests/security/mini-auth-scope.test.js`
- Test: existing security tests

- [ ] **Step 1: Run new regression test**

Run:

```powershell
node tests\security\mini-auth-scope.test.js
```

Expected: exit code 0.

- [ ] **Step 2: Run existing security tests**

Run:

```powershell
node tests\security\session-auth.test.js
node tests\security\login-security.test.js
node tests\security\login-lockout.test.js
```

Expected: all exit code 0.

- [ ] **Step 3: Validate package JSON**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"
```

Expected: `package.json ok`.

### Task 5: Deploy Backend Guard

**Files:**
- Deploy: `miniprogram/cloudfunctions/changePassword`
- Document: `项目文档/发布记录.md` only if CloudBase deployment is performed

- [ ] **Step 1: Confirm CloudBase environment**

Run:

```powershell
cmd /c scripts\invoke-tcb.cmd env list --json
```

Expected: environment includes `cloud1-d1gvh2zc3c5919349`.

- [ ] **Step 2: Deploy only `changePassword`**

Run:

```powershell
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy-cloudfunctions.ps1' -Names changePassword"
```

Expected: deploy command exits 0.

- [ ] **Step 3: Verify cloud function detail**

Run:

```powershell
cmd /c scripts\invoke-tcb.cmd fn detail changePassword --json
```

Expected: cloud function status is active/available and update time is after this deployment.

- [ ] **Step 4: Append release record if deployed**

Append a segmented release record to `项目文档/发布记录.md` with the actual local publish time. The heading below is an example; replace it with the real completion time shown by `Get-Date -Format 'yyyy-MM-dd HH:mm:ss'`:

```md
## 2026-06-09 12:45:30

### 发布类型
云函数安全收口发布

### 发布起因
用户确认员工端不需要自助退出、改密、重新登录；小程序端应只保留首次绑定，后续由 PC 后台管理员解绑、重置密码或禁用。

### 响应分析
`changePassword` 同时服务小程序员工和 PC 后台管理员。为避免破坏 PC 后台临时密码改密链路，本次只拒绝小程序 `sessionToken` 调用，保留 PC 后台 CloudBase Custom Login 调用。

### 主要更新内容
- 小程序端不再暴露员工自助修改密码路由。
- `changePassword` 云函数拒绝小程序登录态调用。
- PC 后台管理员修改当前登录账号密码的能力保留。

### 发布范围
- CloudBase 环境：`cloud1-d1gvh2zc3c5919349`
- 云函数：`changePassword`
- 小程序前端源码已调整；小程序正式版本需要后续通过微信开发者工具上传/提交审核。

### 发布前备份
- `backups/mini-auth-scope-20260609-120226`

### 备注
本记录只说明本次发布内容；用户真机验证完成前不写“已解决”。
```

### Task 6: Final Manual Test Guidance

**Files:**
- No code changes

- [ ] **Step 1: Report required manual tests**

Tell the user to test:

```text
必须人工测试：
1. PC 后台重置员工密码后，员工旧小程序登录态失效。
2. PC 后台解绑员工微信后，原微信重新打开小程序需要回到绑定页。
3. PC 后台禁用员工后，小程序不能继续访问“我的名片 / 数据统计 / 编辑名片”。

建议人工测试：
1. 新员工首次拿到管理员给的手机号和密码，可以完成小程序绑定。
2. PC 后台管理员如果处于临时密码状态，仍可完成后台改密并进入后台。
```
