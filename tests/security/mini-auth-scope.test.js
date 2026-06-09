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
