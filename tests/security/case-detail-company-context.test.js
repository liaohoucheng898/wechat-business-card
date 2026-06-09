const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const sourcePath = path.join(__dirname, '../../miniprogram/cloudfunctions/getCaseDetail/index.js')
const source = fs.readFileSync(sourcePath, 'utf8')

assert.doesNotMatch(source, /companyId\s*=\s*['"]{2}/, 'companyId must not default to an empty optional value')
assert.match(source, /checkRequired\(event,\s*\[\s*['"]caseId['"]\s*,\s*['"]companyId['"]\s*\]\s*\)/, 'case detail must require companyId')
assert.doesNotMatch(source, /companyId\s*&&\s*!\(caseDoc\.companyIds/, 'case-company membership check must not be conditional on optional companyId')
assert.match(source, /!\(caseDoc\.companyIds\s*\|\|\s*\[\]\)\.includes\(companyId\)/, 'case detail must reject mismatched companyId')
assert.doesNotMatch(source, /\n\s*companyIds\s*:/, 'public case detail response must not expose companyIds relation metadata')
