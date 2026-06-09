const path = require('path')

const PUBLIC_FILE_PREFIXES = [
  'admin-upload/',
  'avatars/',
  'public/',
  'richtext/',
  'images/',
  'uploads/company/',
  'uploads/case/',
  'uploads/staff/',
]

const COMPRESS_SOURCE_PREFIXES = [
  'admin-upload/',
  'avatars/',
  'public/',
  'images/',
  'uploads/company/',
  'uploads/case/',
  'uploads/staff/',
]

const BLOCKED_PREFIXES = [
  '.cloudbase-home/',
  'backup/',
  'backups/',
  'private/',
  'secret/',
  'secrets/',
  'credential/',
  'credentials/',
  'tmp/',
  'temp/',
  'logs/',
]

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function toCloudPath(fileID = '') {
  const value = String(fileID || '').trim()
  const match = value.match(/^cloud:\/\/[^/]+\/(.+)$/)
  return match ? match[1] : ''
}

function hasSafePathShape(cloudPath = '') {
  const value = String(cloudPath || '').trim()
  if (!value || value.startsWith('/') || value.includes('\\') || value.includes('\0')) {
    return false
  }

  const parts = value.split('/')
  return parts.every((part) => part && part !== '.' && part !== '..' && !part.startsWith('.'))
}

function hasAllowedPrefix(cloudPath = '', prefixes = []) {
  const normalizedPath = String(cloudPath || '').trim().toLowerCase()
  if (!hasSafePathShape(normalizedPath)) {
    return false
  }
  if (BLOCKED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return false
  }
  return prefixes.some((prefix) => normalizedPath.startsWith(prefix))
}

function hasImageExtension(cloudPath = '') {
  return IMAGE_EXTENSIONS.has(path.extname(String(cloudPath || '')).toLowerCase())
}

function isAllowedPublicCloudFileId(fileID = '') {
  const cloudPath = toCloudPath(fileID)
  return hasAllowedPrefix(cloudPath, PUBLIC_FILE_PREFIXES) && hasImageExtension(cloudPath)
}

function isAllowedCompressedImageSource(fileID = '') {
  const cloudPath = toCloudPath(fileID)
  return hasAllowedPrefix(cloudPath, COMPRESS_SOURCE_PREFIXES) && hasImageExtension(cloudPath)
}

function clampInteger(value, fallback, min, max) {
  const number = Math.floor(Number(value))
  const normalized = Number.isFinite(number) ? number : fallback
  return Math.min(Math.max(normalized, min), max)
}

function clampImageOptions(options = {}) {
  return {
    targetWidth: clampInteger(options.targetWidth, 400, 1, 1600),
    targetHeight: clampInteger(options.targetHeight, 0, 0, 1600),
    quality: clampInteger(options.quality, 80, 60, 90),
  }
}

module.exports = {
  toCloudPath,
  isAllowedPublicCloudFileId,
  isAllowedCompressedImageSource,
  clampImageOptions,
}
