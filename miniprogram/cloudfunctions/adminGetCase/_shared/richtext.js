const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'span',
  'div',
])

const BLOCKED_CONTENT_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript']
const BLOCKED_TAGS = ['meta', 'link', 'base', 'form', 'input', 'button', 'textarea', 'select', 'option', 'frame', 'frameset']
const STYLE_ALLOWLIST = new Set(['text-align', 'color', 'font-size', 'line-height'])
const EMPTY_PARAGRAPH_HTML = '<br>'

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtmlAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeUrlAttr(value = '') {
  return String(value)
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function decodeHtmlAttr(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function sanitizeStyleValue(name, value) {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return ''

  switch (name) {
    case 'text-align':
      return /^(left|center|right|justify)$/i.test(normalizedValue) ? normalizedValue.toLowerCase() : ''
    case 'color':
      return /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(0|0?\.\d+|1))?\s*\))$/i.test(normalizedValue)
        ? normalizedValue
        : ''
    case 'font-size':
      return /^\d{1,3}(px|rpx|em|rem|%)$/i.test(normalizedValue) ? normalizedValue : ''
    case 'line-height':
      return /^\d+(\.\d+)?(px|rpx|em|rem|%)?$/i.test(normalizedValue) ? normalizedValue : ''
    default:
      return ''
  }
}

function sanitizeStyle(style = '') {
  const result = []
  const seen = new Set()

  String(style || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const separatorIndex = item.indexOf(':')
      if (separatorIndex === -1) return
      const name = item.slice(0, separatorIndex).trim().toLowerCase()
      const value = item.slice(separatorIndex + 1).trim()
      if (!STYLE_ALLOWLIST.has(name) || seen.has(name)) return
      const sanitizedValue = sanitizeStyleValue(name, value)
      if (!sanitizedValue) return
      result.push(`${name}:${sanitizedValue}`)
      seen.add(name)
    })

  return result.join(';')
}

function isSafeHref(value = '') {
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(String(value || '').trim())
}

function isSafeSrc(value = '') {
  return /^(cloud:\/\/|https?:\/\/|wxfile:\/\/|\/)/i.test(String(value || '').trim())
}

function sanitizeAttribute(attrName, rawValue) {
  const value = decodeHtmlAttr(rawValue || '').trim()
  if (!value && attrName !== 'alt') {
    return null
  }

  if (attrName === 'style') {
    const sanitizedStyle = sanitizeStyle(value)
    return sanitizedStyle ? { name: attrName, value: sanitizedStyle } : null
  }

  if (attrName === 'href') {
    return isSafeHref(value) ? { name: attrName, value } : null
  }

  if (attrName === 'target') {
    return /^_(blank|self)$/i.test(value) ? { name: attrName, value: value.toLowerCase() } : null
  }

  if (attrName === 'src') {
    return isSafeSrc(value) ? { name: attrName, value } : null
  }

  if (attrName === 'width' || attrName === 'height') {
    return /^\d{1,4}$/.test(value) ? { name: attrName, value } : null
  }

  if (attrName === 'data-cloud-file-id') {
    return /^cloud:\/\/.+/.test(value) ? { name: attrName, value } : null
  }

  if (attrName === 'alt') {
    return { name: attrName, value }
  }

  return null
}

function sanitizeTag(tagName, rawAttrs = '', isClosing = false) {
  const normalizedTag = String(tagName || '').toLowerCase()
  if (!ALLOWED_TAGS.has(normalizedTag)) {
    return ''
  }

  if (isClosing) {
    return normalizedTag === 'br' || normalizedTag === 'img' ? '' : `</${normalizedTag}>`
  }

  const allowedAttrs = new Set(['style'])
  if (normalizedTag === 'a') {
    ;['href', 'target'].forEach((attr) => allowedAttrs.add(attr))
  }
  if (normalizedTag === 'img') {
    ;['src', 'alt', 'width', 'height', 'data-cloud-file-id'].forEach((attr) => allowedAttrs.add(attr))
  }

  const sanitizedAttrs = []
  const attrRegex = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match

  while ((match = attrRegex.exec(rawAttrs || ''))) {
    const attrName = String(match[1] || '').toLowerCase()
    if (!attrName || attrName.startsWith('on') || !allowedAttrs.has(attrName)) {
      continue
    }

    const rawValue = match[2] ?? match[3] ?? match[4] ?? ''
    const sanitized = sanitizeAttribute(attrName, rawValue)
    if (!sanitized) {
      continue
    }
    const escapedValue = sanitized.name === 'src' || sanitized.name === 'href'
      ? escapeUrlAttr(sanitized.value)
      : escapeHtmlAttr(sanitized.value)
    sanitizedAttrs.push(`${sanitized.name}="${escapedValue}"`)
  }

  return `<${normalizedTag}${sanitizedAttrs.length ? ` ${sanitizedAttrs.join(' ')}` : ''}>`
}

function sanitizeRichText(html = '') {
  if (typeof html !== 'string' || !html) {
    return ''
  }

  let safeHtml = html.replace(/<!--[\s\S]*?-->/g, '')

  BLOCKED_CONTENT_TAGS.forEach((tagName) => {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi')
    safeHtml = safeHtml.replace(pattern, '')
  })

  BLOCKED_TAGS.forEach((tagName) => {
    const pattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*\\/?>`, 'gi')
    safeHtml = safeHtml.replace(pattern, '')
  })

  safeHtml = safeHtml.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g, (full, tagName, rawAttrs = '') => {
    const isClosing = full.startsWith('</')
    return sanitizeTag(tagName, rawAttrs, isClosing)
  })

  return normalizeEmptyParagraphs(safeHtml)
}

function mergeImageStyle(style = '') {
  const styleMap = new Map()
  sanitizeStyle(style)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const separatorIndex = item.indexOf(':')
      if (separatorIndex === -1) return
      const name = item.slice(0, separatorIndex).trim().toLowerCase()
      const value = item.slice(separatorIndex + 1).trim()
      if (!name || !value) return
      styleMap.set(name, value)
    })

  styleMap.set('max-width', '100%')
  styleMap.set('height', 'auto')
  styleMap.set('display', 'block')

  return Array.from(styleMap.entries())
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
}

function mergeTextStyle(style = '', defaults = {}) {
  const styleMap = new Map()
  sanitizeStyle(style)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const separatorIndex = item.indexOf(':')
      if (separatorIndex === -1) return
      const name = item.slice(0, separatorIndex).trim().toLowerCase()
      const value = item.slice(separatorIndex + 1).trim()
      if (!name || !value) return
      styleMap.set(name, value)
    })

  Object.entries(defaults).forEach(([name, value]) => {
    if (!styleMap.has(name) && value) {
      styleMap.set(name, value)
    }
  })

  return Array.from(styleMap.entries())
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
}

function normalizeEmptyParagraphs(html = '') {
  return String(html || '').replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (tag, rawAttrs = '', innerHtml = '') => {
    const normalizedInnerHtml = String(innerHtml || '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;|&#160;/gi, '')
      .replace(/&#10240;/gi, '')
      .replace(/\u3000|\u2800/g, '')
      .trim()

    let attrs = rawAttrs || ''
    const styleMatch = attrs.match(/\sstyle=(['"])(.*?)\1/i)
    const nextStyle = mergeTextStyle(styleMatch ? decodeHtmlAttr(styleMatch[2] || '') : '', {
      'font-size': '15px',
      color: '#1F2329',
      'line-height': '1.5',
    })

    if (styleMatch) {
      attrs = attrs.replace(styleMatch[0], ` style="${escapeHtmlAttr(nextStyle)}"`)
    } else if (nextStyle) {
      attrs += ` style="${escapeHtmlAttr(nextStyle)}"`
    }

    return `<p${attrs}>${normalizedInnerHtml ? innerHtml : EMPTY_PARAGRAPH_HTML}</p>`
  })
}

function normalizeHeadingTags(html = '', tagName, defaults = {}) {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  return String(html || '').replace(pattern, (tag, rawAttrs = '', innerHtml = '') => {
    let attrs = rawAttrs || ''
    const styleMatch = attrs.match(/\sstyle=(['"])(.*?)\1/i)
    const nextStyle = mergeTextStyle(styleMatch ? decodeHtmlAttr(styleMatch[2] || '') : '', defaults)

    if (styleMatch) {
      attrs = attrs.replace(styleMatch[0], ` style="${escapeHtmlAttr(nextStyle)}"`)
    } else if (nextStyle) {
      attrs += ` style="${escapeHtmlAttr(nextStyle)}"`
    }

    return `<${tagName}${attrs}>${innerHtml}</${tagName}>`
  })
}

function normalizeRichTextHtml(html = '', urlMap = {}) {
  let safeHtml = sanitizeRichText(html)
  safeHtml = normalizeHeadingTags(safeHtml, 'h1', {
    color: '#1F2329',
    'line-height': '1.5',
  })
  safeHtml = normalizeHeadingTags(safeHtml, 'h2', {
    color: '#1F2329',
    'font-size': '17px',
    'line-height': '2.5',
  })
  safeHtml = normalizeHeadingTags(safeHtml, 'h3', {
    color: '#1F2329',
    'font-size': '19px',
    'line-height': '2.5',
  })
  return safeHtml.replace(/<img\b([^>]*)>/gi, (tag, rawAttrs = '') => {
    let attrs = rawAttrs
    const fileIdMatch = attrs.match(/\sdata-cloud-file-id=(['"])(.*?)\1/i)
    const cloudFileId = fileIdMatch ? decodeHtmlAttr(fileIdMatch[2] || '') : ''
    const srcMatch = attrs.match(/\ssrc=(['"])(.*?)\1/i)
    if (srcMatch) {
      const rawSrc = decodeHtmlAttr(srcMatch[2] || '')
      const nextSrc = cloudFileId
        ? (urlMap[cloudFileId] || rawSrc)
        : (rawSrc.startsWith('cloud://') ? (urlMap[rawSrc] || rawSrc) : rawSrc)
      attrs = attrs.replace(srcMatch[0], ` src="${escapeUrlAttr(nextSrc)}"`)
    } else if (cloudFileId && urlMap[cloudFileId]) {
      attrs += ` src="${escapeUrlAttr(urlMap[cloudFileId])}"`
    }

    const styleMatch = attrs.match(/\sstyle=(['"])(.*?)\1/i)
    const nextStyle = mergeImageStyle(styleMatch ? decodeHtmlAttr(styleMatch[2] || '') : '')
    if (styleMatch) {
      attrs = attrs.replace(styleMatch[0], ` style="${escapeHtmlAttr(nextStyle)}"`)
    } else {
      attrs += ` style="${escapeHtmlAttr(nextStyle)}"`
    }

    return `<img${attrs}>`
  })
}

function extractCloudFileIds(html = '') {
  return Array.from(new Set(String(html || '').match(/cloud:\/\/[^\s"'<>]+/g) || []))
}

async function resolveRichTextUrls(cloud, html = '') {
  const normalizedHtml = normalizeRichTextHtml(html)
  const fileIds = extractCloudFileIds(normalizedHtml)
  if (!fileIds.length) {
    return normalizedHtml
  }

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: fileIds })
    const urlMap = {}
    ;(fileList || []).forEach((item) => {
      if (item && item.fileID && item.tempFileURL) {
        urlMap[item.fileID] = item.tempFileURL
      }
    })

    return normalizeRichTextHtml(normalizedHtml, urlMap)
  } catch (error) {
    console.error('[richtext] resolveRichTextUrls failed:', error?.message || String(error))
    return normalizedHtml
  }
}

module.exports = {
  sanitizeRichText,
  resolveRichTextUrls,
  normalizeRichTextHtml,
}
