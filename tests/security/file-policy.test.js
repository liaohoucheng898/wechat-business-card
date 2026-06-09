const assert = require('node:assert/strict')

const policy = require('../../miniprogram/cloudfunctions/_shared/file-policy')

assert.equal(policy.toCloudPath('cloud://cloud1-d1gvh2zc3c5919349/admin-upload/cover.jpg'), 'admin-upload/cover.jpg')
assert.equal(policy.toCloudPath('https://example.com/a.jpg'), '')

assert.equal(
  policy.isAllowedPublicCloudFileId('cloud://cloud1-d1gvh2zc3c5919349/admin-upload/editor/a.jpg'),
  true,
  'rich-text editor uploads should be public-content eligible'
)
assert.equal(
  policy.isAllowedPublicCloudFileId('cloud://cloud1-d1gvh2zc3c5919349/avatars/staff-a.jpg'),
  true,
  'staff avatar uploads should be public-content eligible'
)
assert.equal(
  policy.isAllowedPublicCloudFileId('cloud://cloud1-d1gvh2zc3c5919349/.cloudbase-home/.config/.cloudbase/auth.json'),
  false,
  'CloudBase auth state must never be treated as public content'
)
assert.equal(
  policy.isAllowedPublicCloudFileId('cloud://cloud1-d1gvh2zc3c5919349/private/payroll.xlsx'),
  false,
  'private storage paths must not be converted to temporary public URLs'
)

assert.equal(
  policy.isAllowedCompressedImageSource('cloud://cloud1-d1gvh2zc3c5919349/admin-upload/case-cover.jpg'),
  true,
  'admin image uploads should be eligible for compression'
)
assert.equal(
  policy.isAllowedCompressedImageSource('cloud://cloud1-d1gvh2zc3c5919349/backups/archive.jpg'),
  false,
  'backup paths should not be eligible for compression'
)

assert.deepEqual(
  policy.clampImageOptions({ targetWidth: 9000, targetHeight: -1, quality: 1 }),
  { targetWidth: 1600, targetHeight: 0, quality: 60 },
  'image options should be clamped to safe resource bounds'
)
assert.deepEqual(
  policy.clampImageOptions({ targetWidth: 200, targetHeight: 120, quality: 99 }),
  { targetWidth: 200, targetHeight: 120, quality: 90 },
  'quality should be capped while preserving legitimate dimensions'
)
