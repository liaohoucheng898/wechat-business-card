const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { signViewToken, verifyViewToken } = require('../../miniprogram/cloudfunctions/_shared/view-token')

const now = 1_800_000_000_000
const payload = {
  staffId: 'staff-a',
  companyId: 'company-a',
  logType: 'case_click',
  caseId: 'case-a',
}
const token = signViewToken(payload, { now, ttlMs: 60_000, secret: 'unit-test-secret' })

assert.equal(typeof token, 'string')
assert.equal(verifyViewToken(token, payload, { now: now + 1000, secret: 'unit-test-secret' }).ok, true)
assert.equal(
  verifyViewToken(token, { ...payload, caseId: 'case-b' }, { now: now + 1000, secret: 'unit-test-secret' }).ok,
  false,
  'tampered caseId should fail verification'
)
assert.equal(
  verifyViewToken(token, payload, { now: now + 120_000, secret: 'unit-test-secret' }).ok,
  false,
  'expired view token should fail verification'
)

const getCardInfo = fs.readFileSync(path.join(__dirname, '../../miniprogram/cloudfunctions/getCardInfo/index.js'), 'utf8')
const getCardCases = fs.readFileSync(path.join(__dirname, '../../miniprogram/cloudfunctions/getCardCases/index.js'), 'utf8')
const writeViewLog = fs.readFileSync(path.join(__dirname, '../../miniprogram/cloudfunctions/writeViewLog/index.js'), 'utf8')
const cardPage = fs.readFileSync(path.join(__dirname, '../../miniprogram/pages/card/index.js'), 'utf8')

assert.match(getCardInfo, /signViewToken\(/, 'getCardInfo must issue signed view tokens')
assert.match(getCardCases, /signViewToken\(/, 'getCardCases must issue signed case-click tokens for paginated cases')
assert.match(writeViewLog, /verifyViewToken\(/, 'writeViewLog must verify signed view tokens before writing logs')
assert.match(cardPage, /viewToken/, 'card page must pass the signed view token to writeViewLog')
