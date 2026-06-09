const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const publicLoginFiles = [
  'miniprogram/cloudfunctions/passwordLogin/index.js',
  'miniprogram/cloudfunctions/adminPasswordLogin/index.js',
  'miniprogram/cloudfunctions/adminLogin/index.js',
]

for (const relativePath of publicLoginFiles) {
  const source = fs.readFileSync(path.resolve(__dirname, '../..', relativePath), 'utf8')
  assert.equal(
    /passwordLockUntil\s*=\s*new Date/.test(source),
    false,
    `${relativePath} must not create account-wide password lockouts from public login attempts`
  )
}
