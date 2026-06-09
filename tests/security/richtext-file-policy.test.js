const assert = require('node:assert/strict')

const { resolveRichTextUrls } = require('../../miniprogram/cloudfunctions/_shared/richtext')

const allowedFileId = 'cloud://cloud1-d1gvh2zc3c5919349/admin-upload/editor/public-image.jpg'
const privateFileId = 'cloud://cloud1-d1gvh2zc3c5919349/private/payroll.jpg'
const requestedFileLists = []

const fakeCloud = {
  async getTempFileURL({ fileList }) {
    requestedFileLists.push(fileList)
    return {
      fileList: fileList.map((fileID) => ({
        fileID,
        tempFileURL: `https://temp.example.com/${encodeURIComponent(fileID)}`
      }))
    }
  }
}

;(async () => {
  const html = `<p><img src="${allowedFileId}"><img src="${privateFileId}"></p>`
  const resolved = await resolveRichTextUrls(fakeCloud, html)

  assert.deepEqual(requestedFileLists, [[allowedFileId]], 'only allowed public cloud files should be resolved')
  assert.match(resolved, /https:\/\/temp\.example\.com\//, 'allowed file should be converted to a temp URL')
  assert.match(resolved, new RegExp(privateFileId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'private file should remain unresolved')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
