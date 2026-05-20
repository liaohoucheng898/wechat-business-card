/**
 * imageCompress — 图片压缩
 * 触发：图片上传后由其他云函数内部调用
 * 鉴权：内部调用
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const sharp = require('sharp')
const path = require('path')
const { success, fail } = require('./_shared/response')
const { E0102, E0701, E0702, E0703 } = require('./_shared/error-codes')

// 支持的图片格式
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp']
// 最大文件大小 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

exports.main = async (event, context) => {
  const {
    fileID,
    targetWidth = 400,
    targetHeight = 0,
    quality = 80,
  } = event

  try {
    if (!fileID) {
      return fail(E0701, '缺少 fileID 参数')
    }

    // 1. 检查文件格式
    const ext = path.extname(fileID).toLowerCase()
    if (!SUPPORTED_FORMATS.includes(ext)) {
      return fail(E0701, `不支持的图片格式: ${ext}，仅支持 JPG/PNG/WebP`)
    }

    // 2. 从云存储下载原图
    let fileBuffer
    try {
      const downloadResult = await cloud.downloadFile({ fileID })
      fileBuffer = downloadResult.fileContent
    } catch (e) {
      console.error('[imageCompress] download failed:', e?.message || String(e))
      return fail(E0703, '下载原图失败')
    }

    // 3. 检查文件大小
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return fail(E0702, `文件大小 ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB，超过5MB限制`)
    }

    // 4. 使用 sharp 压缩
    let compressed
    try {
      let pipeline = sharp(fileBuffer)

      // 设置尺寸
      const resizeOpts = { width: targetWidth }
      if (targetHeight > 0) {
        resizeOpts.height = targetHeight
        resizeOpts.fit = 'cover'
      }

      pipeline = pipeline.resize(resizeOpts)

      // 输出为 JPEG（最佳压缩比）
      compressed = await pipeline.jpeg({ quality, progressive: true }).toBuffer()
    } catch (e) {
      console.error('[imageCompress] compress failed:', e?.message || String(e))
      return fail(E0703)
    }

    // 5. 上传压缩后的图片到云存储
    // 在原文件名基础上加 -thumb 后缀
    const originalPath = fileID.replace(/^cloud:\/\/[^/]+\//, '')
    const thumbPath = originalPath.replace(/(\.[^.]+)$/, '-thumb.jpg')

    const uploadResult = await cloud.uploadFile({
      cloudPath: thumbPath,
      fileContent: compressed,
    })

    return success({ fileID: uploadResult.fileID })
  } catch (e) {
    console.error('[imageCompress] error:', e?.message || String(e))
    return fail(E0102)
  }
}
