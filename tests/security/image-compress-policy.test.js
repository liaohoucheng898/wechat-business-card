const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const sourcePath = path.join(__dirname, '../../miniprogram/cloudfunctions/imageCompress/index.js')
const source = fs.readFileSync(sourcePath, 'utf8')

assert.match(source, /require\(['"]\.\/_shared\/file-policy['"]\)/, 'imageCompress must import the shared file policy')
assert.match(source, /isAllowedCompressedImageSource\(fileID\)/, 'imageCompress must reject disallowed cloud file IDs')
assert.match(source, /clampImageOptions\(/, 'imageCompress must clamp caller supplied resize options')

const policyCheckIndex = source.indexOf('isAllowedCompressedImageSource(fileID)')
const downloadIndex = source.indexOf('cloud.downloadFile')
assert.ok(policyCheckIndex !== -1 && downloadIndex !== -1 && policyCheckIndex < downloadIndex, 'file policy check must run before cloud.downloadFile')
