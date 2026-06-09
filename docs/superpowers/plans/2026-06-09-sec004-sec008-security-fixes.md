# SEC-004 To SEC-008 Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the remaining reportable findings from the 2026-06-08 Codex Security review: SEC-004, SEC-005, SEC-006, SEC-007, and SEC-008.

**Architecture:** Enforce the security invariant on the server side, close direct object/reference trust gaps, and keep public visitor behavior compatible through short-lived signed view events. Add focused tests before implementation and verify each original vulnerable source-to-sink path no longer accepts unsafe input.

**Tech Stack:** WeChat Mini Program CloudBase cloud functions, Node.js CommonJS modules, wx-server-sdk, @cloudbase/node-sdk, focused Node assertion tests.

---

### Task 1: Sensitive Local Artifact Cleanup

**Files:**
- Inspect: `项目文档/安全审查/7e02ad3_20260608_164753/artifacts`
- Modify: no tracked source files unless a sanitized replacement is needed

- [ ] **Step 1: Verify sensitive artifact residue**

Run:

```powershell
rg -n -i -S "AKID|SecretId|SecretKey|PRIVATE KEY|credential" "项目文档/安全审查"
```

Expected before cleanup: matches in raw artifact CSV files only, not in tracked source.

- [ ] **Step 2: Remove or quarantine raw artifact directory**

Remove the untracked `项目文档/安全审查/7e02ad3_20260608_164753/artifacts` directory after confirming it is not tracked by Git.

- [ ] **Step 3: Verify cleanup**

Run:

```powershell
git status --short -- "项目文档/安全审查"
rg -n -i -S "AKID|SecretId|SecretKey|PRIVATE KEY|credential" "项目文档/安全审查"
```

Expected after cleanup: no untracked artifact directory with raw secrets. The visible report may still contain generic words such as `credential.secretId`, but no secret values.

### Task 2: Storage And File Reference Policy

**Files:**
- Create: `miniprogram/cloudfunctions/_shared/file-policy.js`
- Copy for deployed functions that need it: `imageCompress/_shared/file-policy.js`, `getCardInfo/_shared/file-policy.js`, `getCaseDetail/_shared/file-policy.js`, `adminUpdateCompany/_shared/file-policy.js`, `adminUpdateCase/_shared/file-policy.js`
- Test: `tests/security/file-policy.test.js`

- [ ] **Step 1: Write failing policy test**

Test required behavior:

```js
assert.equal(policy.isAllowedPublicCloudFileId('cloud://env/public/richtext/a.png'), true)
assert.equal(policy.isAllowedPublicCloudFileId('cloud://env/private/a.png'), false)
assert.equal(policy.isAllowedCompressedImageSource('cloud://env/uploads/company/logo/a.jpg'), true)
assert.equal(policy.isAllowedCompressedImageSource('cloud://env/.cloudbase/auth.json'), false)
assert.equal(policy.clampImageOptions({ targetWidth: 9000, targetHeight: -1, quality: 1 }).targetWidth, 1600)
assert.equal(policy.clampImageOptions({ targetWidth: 200, targetHeight: 0, quality: 99 }).quality, 90)
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
cmd /c node tests\security\file-policy.test.js
```

Expected: fail because `file-policy.js` does not exist.

- [ ] **Step 3: Implement minimal policy helper**

Add prefix allowlists:

```js
const PUBLIC_FILE_PREFIXES = [
  'public/',
  'richtext/',
  'uploads/company/',
  'uploads/case/',
  'uploads/staff/',
  'images/',
]
```

Normalize a `cloud://env/path` file ID to `path`, reject traversal-like paths, reject empty paths, and clamp width/height/quality.

- [ ] **Step 4: Run policy test to verify GREEN**

Run:

```powershell
cmd /c node tests\security\file-policy.test.js
```

Expected: pass.

### Task 3: SEC-004 imageCompress Authorization

**Files:**
- Modify: `miniprogram/cloudfunctions/imageCompress/index.js`
- Copy: `miniprogram/cloudfunctions/imageCompress/_shared/file-policy.js`
- Test: `tests/security/image-compress-policy.test.js`

- [ ] **Step 1: Write failing source assertion**

Assert that `imageCompress` imports `isAllowedCompressedImageSource` and rejects unsafe file IDs before `cloud.downloadFile`.

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
cmd /c node tests\security\image-compress-policy.test.js
```

Expected: fail on missing policy import/check.

- [ ] **Step 3: Implement minimal fix**

Before download:

```js
if (!isAllowedCompressedImageSource(fileID)) {
  return fail(E0701, '不允许处理该文件')
}
```

Use `clampImageOptions(event)` for `targetWidth`, `targetHeight`, and `quality`.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```powershell
cmd /c node tests\security\image-compress-policy.test.js
```

Expected: pass.

### Task 4: SEC-005 Case Detail Company Context

**Files:**
- Modify: `miniprogram/cloudfunctions/getCaseDetail/index.js`
- Test: `tests/security/case-detail-company-context.test.js`

- [ ] **Step 1: Write failing source assertion**

Assert that `companyId` is required, no default empty value is used, membership is checked unconditionally, and response does not expose `companyIds`.

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
cmd /c node tests\security\case-detail-company-context.test.js
```

Expected: fail on optional `companyId` and `companyIds` response.

- [ ] **Step 3: Implement minimal fix**

Require `caseId` and `companyId`; reject missing or mismatched `companyId`; remove `companyIds` from public response.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```powershell
cmd /c node tests\security\case-detail-company-context.test.js
```

Expected: pass.

### Task 5: SEC-006 Rich Text File URL Ownership Guard

**Files:**
- Modify: `miniprogram/cloudfunctions/_shared/richtext.js`
- Copy modified helper to deployed functions that contain `_shared/richtext.js`
- Test: `tests/security/richtext-file-policy.test.js`

- [ ] **Step 1: Write failing test**

Assert that cloud file IDs outside allowed public prefixes are not sent to `getTempFileURL` and remain unresolved or are removed from resolved output.

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
cmd /c node tests\security\richtext-file-policy.test.js
```

Expected: fail because all `cloud://` IDs are currently resolved.

- [ ] **Step 3: Implement minimal fix**

Filter `extractCloudFileIds(normalizedHtml)` through `isAllowedPublicCloudFileId` before `getTempFileURL`. Keep sanitizer behavior intact.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```powershell
cmd /c node tests\security\richtext-file-policy.test.js
```

Expected: pass.

### Task 6: SEC-007 Admin Relation Validation

**Files:**
- Create: `miniprogram/cloudfunctions/_shared/relation-policy.js`
- Copy for affected functions: `adminCreateStaff/_shared/relation-policy.js`, `adminUpdateStaff/_shared/relation-policy.js`, `adminUpdateCase/_shared/relation-policy.js`
- Modify: `adminCreateStaff/index.js`, `adminUpdateStaff/index.js`, `adminUpdateCase/index.js`
- Test: `tests/security/admin-relation-policy.test.js`

- [ ] **Step 1: Write failing source and helper test**

Assert relation helper validates non-empty unique IDs and that affected functions call company/category validation before writing relation arrays.

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
cmd /c node tests\security\admin-relation-policy.test.js
```

Expected: fail because helper and call sites are missing.

- [ ] **Step 3: Implement minimal relation helper**

Validate unique IDs, load referenced docs, reject missing/deleted/disabled companies, reject missing/deleted categories.

- [ ] **Step 4: Wire affected admin functions**

Use helper for `enabledCompanies`, `companyIds`, and `categoryIds` before writing updates.

- [ ] **Step 5: Run test to verify GREEN**

Run:

```powershell
cmd /c node tests\security\admin-relation-policy.test.js
```

Expected: pass.

### Task 7: SEC-008 Signed View Events

**Files:**
- Create: `miniprogram/cloudfunctions/_shared/view-token.js`
- Copy to `getCardInfo/_shared/view-token.js`, `getCaseDetail/_shared/view-token.js`, `writeViewLog/_shared/view-token.js`
- Modify: `getCardInfo/index.js`, `getCaseDetail/index.js`, `writeViewLog/index.js`, mini-program callers that pass log fields
- Test: `tests/security/view-log-token.test.js`

- [ ] **Step 1: Write failing token test**

Assert token signs `staffId`, `companyId`, `logType`, optional `caseId`, and expiry; assert tampering fails.

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
cmd /c node tests\security\view-log-token.test.js
```

Expected: fail because view token helper does not exist.

- [ ] **Step 3: Implement minimal token helper**

Use HMAC SHA-256 with `VIEW_LOG_SIGNING_SECRET` when present, falling back to a deterministic environment-scoped secret for compatibility. Tokens expire after a short TTL.

- [ ] **Step 4: Wire read and write paths**

`getCardInfo` returns a card view token. `getCaseDetail` returns a case click token. `writeViewLog` requires and verifies `viewToken` before writing.

- [ ] **Step 5: Run token test to verify GREEN**

Run:

```powershell
cmd /c node tests\security\view-log-token.test.js
```

Expected: pass.

### Task 8: Final Verification And Release Prep

**Files:**
- Modify: `项目文档/发布记录.md` only after deployment happens

- [ ] **Step 1: Run focused security tests**

Run all tests under `tests/security`.

- [ ] **Step 2: Run syntax checks**

Run `node --check` on changed cloud function JS files.

- [ ] **Step 3: Run admin build**

Run:

```powershell
cmd /c npm run cb:build:admin
```

Expected: build succeeds; existing Sass legacy and chunk-size warnings may remain.

- [ ] **Step 4: Deploy affected cloud functions**

Deploy backend functions first: `imageCompress`, `getCaseDetail`, `getCardInfo`, `writeViewLog`, `adminCreateStaff`, `adminUpdateStaff`, `adminUpdateCase`.

- [ ] **Step 5: Record release**

Append segmented release record only after deployment completes.
