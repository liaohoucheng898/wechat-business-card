<template>
  <div class="tiny-editor">
    <Editor
      :id="editorId"
      v-model="editorContent"
      :model-events="editorModelEvents"
      :init="editorInit"
      :tinymce-script-src="tinymceScriptSrc"
      @onInit="handleEditorInit"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import Editor from '@tinymce/tinymce-vue'
import cloudApp from '@/cloud/init'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: Number, default: 300 }
})

const emit = defineEmits(['update:modelValue'])

const editorId = `tinymce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const editorInstance = ref(null)
const editorContent = ref('')
const isSyncingFromModel = ref(false)
const tempUrlToFileIdMap = new Map()
const fileIdToTempUrlMap = new Map()
const editorModelEvents = 'change input undo redo'
const lineHeightOptions = ['1.0', '1.2', '1.5', '1.8', '2.0', '2.5', '3.0']

const baseUrl = import.meta.env.BASE_URL || '/'
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
const tinymceBaseUrl = `${normalizedBaseUrl}/tinymce`
const tinymceScriptSrc = `${tinymceBaseUrl}/tinymce.min.js`
const languageUrl = `${tinymceBaseUrl}/langs/zh-Hans.js`

function decodeHtmlAttr(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function normalizeAttributeValue(value = '') {
  return decodeHtmlAttr(value).trim()
}

function getCloudFileId(value = '') {
  const normalizedValue = normalizeAttributeValue(value)
  return normalizedValue.startsWith('cloud://') ? normalizedValue : ''
}

function getMappedFileId(value = '') {
  const normalizedValue = normalizeAttributeValue(value)
  return normalizedValue ? (tempUrlToFileIdMap.get(normalizedValue) || '') : ''
}

function getImageFileId(img) {
  if (!img) return ''

  const dataCloudFileId = img.getAttribute('data-cloud-file-id') || ''
  const src = img.getAttribute('src') || ''

  return getCloudFileId(dataCloudFileId)
    || getCloudFileId(src)
    || getMappedFileId(dataCloudFileId)
    || getMappedFileId(src)
    || ''
}

function parseStyleEntries(style = '') {
  return String(style || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(':')
      if (separatorIndex === -1) return null
      const name = item.slice(0, separatorIndex).trim().toLowerCase()
      const value = item.slice(separatorIndex + 1).trim()
      if (!name || !value) return null
      return [name, value]
    })
    .filter(Boolean)
}

function stringifyStyleEntries(entries = []) {
  return entries.map(([name, value]) => `${name}:${value}`).join(';')
}

function mergeDefaultTextStyle(style = '', defaults = {}) {
  const styleMap = new Map(parseStyleEntries(style))
  Object.entries(defaults).forEach(([name, value]) => {
    if (!styleMap.has(name) && value) {
      styleMap.set(name, value)
    }
  })
  return stringifyStyleEntries(Array.from(styleMap.entries()))
}

function isEffectivelyEmptyParagraph(paragraph) {
  if (!paragraph) return false
  if (paragraph.querySelector('img,video,iframe,table,ul,ol,li')) return false

  const normalizedHtml = (paragraph.innerHTML || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;|&#160;/gi, '')
    .replace(/&#10240;/gi, '')
    .replace(/\u3000|\u2800/g, '')
    .trim()

  return !normalizedHtml
}

const EMPTY_PARAGRAPH_HTML = '<br>'

function applyLineHeight(editor, value) {
  if (!editor || !value) return

  editor.undoManager.transact(() => {
    let blocks = editor.selection.getSelectedBlocks() || []
    if (!blocks.length) {
      const currentBlock = editor.dom.getParent(editor.selection.getStart(), 'p,h1,h2,h3,li,div')
      if (currentBlock) {
        blocks = [currentBlock]
      }
    }

    blocks
      .filter((block) => block && block.nodeType === 1 && block.nodeName.toLowerCase() !== 'body')
      .forEach((block) => {
        editor.dom.setStyle(block, 'line-height', value)
      })
  })

  editor.nodeChanged()
  editor.save()
  const nextContent = editor.getContent()
  if (nextContent !== editorContent.value) {
    editorContent.value = nextContent
  }
}

function normalizeEditorDocument(doc, { useStoredImageIds = false } = {}) {
  doc.querySelectorAll('p').forEach((paragraph) => {
    const nextStyle = mergeDefaultTextStyle(paragraph.getAttribute('style') || '', {
      'font-size': '15px',
      color: '#1F2329',
      'line-height': '1.5'
    })
    if (nextStyle) {
      paragraph.setAttribute('style', nextStyle)
    }
    if (isEffectivelyEmptyParagraph(paragraph)) {
      paragraph.innerHTML = EMPTY_PARAGRAPH_HTML
    }
  })

  doc.querySelectorAll('h1').forEach((heading) => {
    const nextStyle = mergeDefaultTextStyle(heading.getAttribute('style') || '', {
      color: '#1F2329',
      'line-height': '1.5'
    })
    if (nextStyle) {
      heading.setAttribute('style', nextStyle)
    }
  })

  doc.querySelectorAll('h2').forEach((heading) => {
    const nextStyle = mergeDefaultTextStyle(heading.getAttribute('style') || '', {
      color: '#1F2329',
      'font-size': '17px',
      'line-height': '2.5'
    })
    if (nextStyle) {
      heading.setAttribute('style', nextStyle)
    }
  })

  doc.querySelectorAll('h3').forEach((heading) => {
    const nextStyle = mergeDefaultTextStyle(heading.getAttribute('style') || '', {
      color: '#1F2329',
      'font-size': '19px',
      'line-height': '2.5'
    })
    if (nextStyle) {
      heading.setAttribute('style', nextStyle)
    }
  })

  doc.querySelectorAll('img').forEach((img) => {
    const fileID = getImageFileId(img)
    if (!fileID) return
    img.setAttribute('data-cloud-file-id', fileID)
    if (useStoredImageIds) {
      img.setAttribute('src', fileID)
      return
    }
    const tempUrl = fileIdToTempUrlMap.get(fileID)
    if (tempUrl) {
      img.setAttribute('src', tempUrl)
    }
  })

  return doc.body.innerHTML
}

function extractCloudFileIds(content = '') {
  return Array.from(new Set(content.match(/cloud:\/\/[^\s"'<>]+/g) || []))
}

async function cacheTempUrls(fileIDs = []) {
  const pending = fileIDs.filter((fileID) => fileID && !fileIdToTempUrlMap.has(fileID))
  if (!pending.length) return

  try {
    const res = await cloudApp.getTempFileURL({ fileList: pending })
    ;(res.fileList || []).forEach((item) => {
      if (!item?.fileID || !item?.tempFileURL) return
      fileIdToTempUrlMap.set(item.fileID, item.tempFileURL)
      tempUrlToFileIdMap.set(item.tempFileURL, item.fileID)
    })
  } catch (error) {
    console.error('[TinyEditor] getTempFileURL failed:', error?.message || String(error))
  }
}

async function resolveEditorContent(content = '') {
  const fileIDs = extractCloudFileIds(content)
  await cacheTempUrls(fileIDs)
  if (typeof window === 'undefined' || !window.DOMParser) {
    return content
  }

  const doc = new window.DOMParser().parseFromString(content, 'text/html')
  return normalizeEditorDocument(doc)
}

function restoreStoredContent(content = '') {
  if (typeof window !== 'undefined' && window.DOMParser) {
    const doc = new window.DOMParser().parseFromString(content, 'text/html')
    return normalizeEditorDocument(doc, { useStoredImageIds: true })
  }

  let html = content
  tempUrlToFileIdMap.forEach((fileID, tempUrl) => {
    if (html.includes(tempUrl)) {
      html = html.split(tempUrl).join(fileID)
    }
    const escapedTempUrl = tempUrl.replace(/&/g, '&amp;')
    if (html.includes(escapedTempUrl)) {
      html = html.split(escapedTempUrl).join(fileID)
    }
  })
  return html
}

function compressImage(file, maxWidth = 750) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let width = img.width
      let height = img.height
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width))
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        resolve(blob)
      }, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

async function uploadToCloud(blob) {
  const fileName = `admin-upload/editor/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const result = await cloudApp.uploadFile({
    cloudPath: fileName,
    filePath: blob
  })
  const fileID = result.fileID
  const urlRes = await cloudApp.getTempFileURL({ fileList: [fileID] })
  const tempURL = urlRes.fileList?.[0]?.tempFileURL || ''
  if (tempURL) {
    fileIdToTempUrlMap.set(fileID, tempURL)
    tempUrlToFileIdMap.set(tempURL, fileID)
  }
  return {
    fileID,
    tempURL: tempURL || fileID
  }
}

async function syncFromModel(content = '') {
  const resolvedContent = await resolveEditorContent(content || '')
  if (editorContent.value === resolvedContent) return

  isSyncingFromModel.value = true
  editorContent.value = resolvedContent
  await nextTick()
  isSyncingFromModel.value = false
}

async function handleEditorInit(_, editor) {
  editorInstance.value = editor
  await syncFromModel(props.modelValue)
}

const editorInit = computed(() => ({
  height: props.height,
  base_url: tinymceBaseUrl,
  suffix: '.min',
  forced_root_block: 'p',
  forced_root_block_attrs: {
    style: 'font-size:15px;color:#1F2329;line-height:1.5;'
  },
  pad_empty_with_br: true,
  remove_trailing_brs: false,
  language: 'zh-Hans',
  language_url: languageUrl,
  branding: false,
  promotion: false,
  menubar: false,
  statusbar: false,
  plugins: 'lists link image autolink',
  toolbar_mode: 'wrap',
  toolbar:
    'bold italic underline | blocks fontsize lineheight | forecolor | bullist numlist | alignleft aligncenter alignright | image link | removeformat',
  font_size_formats: '12px 14px 15px 16px 17px 18px 20px 24px',
  color_map: [
    '#1F2329', '主文字',
    '#646A73', '次要文字',
    '#8F959E', '辅助文字',
    '#1677ff', '品牌蓝',
    '#0EC972', '成功',
    '#FD8C43', '警告',
    '#F65146', '错误',
    '#988BFF', '辅助紫'
  ],
  block_formats: '正文=p;标题2=h2;标题3=h3',
  formats: {
    p: {
      block: 'p',
      styles: {
        color: '#1F2329',
        'font-size': '15px',
        'line-height': '1.5'
      }
    },
    h2: {
      block: 'h2',
      styles: {
        color: '#1F2329',
        'font-size': '17px',
        'line-height': '2.5'
      }
    },
    h3: {
      block: 'h3',
      styles: {
        color: '#1F2329',
        'font-size': '19px',
        'line-height': '2.5'
      }
    }
  },
  setup: (editor) => {
    editor.ui.registry.addMenuButton('lineheight', {
      text: '行距',
      fetch: (callback) => {
        callback(
          lineHeightOptions.map((option) => ({
            type: 'menuitem',
            text: option,
            onAction: () => applyLineHeight(editor, option)
          }))
        )
      }
    })
  },
  paste_data_images: false,
  paste_preprocess: (_, args) => {
    args.content = args.content.replace(/<img[^>]*>/gi, '')
  },
  valid_elements:
    'p[style],br,strong/b[style],em/i[style],u[style],h2[style],h3[style],ul[style],ol[style],li[style],a[href|target|style],img[src|alt|width|height|style|data-cloud-file-id],span[style],div[style]',
  valid_styles: { '*': 'text-align,color,font-size,line-height' },
  images_upload_handler: async (blobInfo) => {
    try {
      const blob = blobInfo.blob()
      const compressed = await compressImage(blob, 750)
      const uploadResult = await uploadToCloud(compressed)
      return uploadResult.tempURL
    } catch {
      ElMessage.error('图片上传失败')
      throw new Error('图片上传失败')
    }
  },
  file_picker_types: 'image',
  file_picker_callback: (callback) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        ElMessage.warning('图片大小不能超过 5MB')
        return
      }
      try {
        const compressed = await compressImage(file, 750)
        const uploadResult = await uploadToCloud(compressed)
        callback(uploadResult.tempURL, { alt: file.name })
      } catch {
        ElMessage.error('图片上传失败')
      }
    }
    input.click()
  },
  content_style: `
    body {
      font-family: 'Inter', 'Source Han Sans SC', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 15px;
      color: #1F2329;
      line-height: 1.5;
      padding: 12px;
    }

    p {
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 14px;
    }

    h1 {
      color: #1F2329;
      line-height: 1.5;
      margin: 24px 0 12px;
    }

    h2 {
      color: #1F2329;
      font-size: 17px;
      line-height: 2.5;
      margin: 24px 0 12px;
    }

    h3 {
      color: #1F2329;
      font-size: 19px;
      line-height: 2.5;
      margin: 24px 0 12px;
    }

    img {
      max-width: 100%;
      height: auto;
    }
  `
}))

watch(
  () => props.modelValue,
  async (value) => {
    await syncFromModel(value || '')
  },
  { immediate: true }
)

watch(
  editorContent,
  (value) => {
    if (isSyncingFromModel.value) return
    const normalizedValue = restoreStoredContent(value || '')
    if (normalizedValue !== (props.modelValue || '')) {
      emit('update:modelValue', normalizedValue)
    }
  }
)

onBeforeUnmount(() => {
  if (editorInstance.value) {
    editorInstance.value.remove()
    editorInstance.value = null
  }
  tempUrlToFileIdMap.clear()
  fileIdToTempUrlMap.clear()
})
</script>

<style lang="scss" scoped>
.tiny-editor {
  width: 100%;
  border-radius: 8px;
  overflow: visible;

  :deep(.tox-tinymce) {
    border-radius: 8px;
    border-color: #DBDEE3;
  }
}
</style>
