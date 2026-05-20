<template>
  <div class="case-edit-page">
    <!-- 面包屑 -->
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/cases' }">案例管理</el-breadcrumb-item>
        <el-breadcrumb-item>{{ isEdit ? '编辑案例' : '新增案例' }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 表单 -->
    <div class="card-wrapper">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        label-position="right"
        v-loading="pageLoading"
      >
        <!-- 所属公司 -->
        <el-form-item label="所属公司" prop="companyIds">
          <el-checkbox-group v-model="form.companyIds">
            <el-checkbox
              v-for="(name, id) in companyMap"
              :key="id"
              :label="id"
            >
              {{ name }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 企业全称 -->
        <el-form-item label="企业全称" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入企业全称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <!-- 封面图 -->
        <el-form-item label="封面图" prop="cover">
          <ImageUpload
            v-model="form.cover"
            ratio="16:9"
            :width="240"
            :max-size="3"
            fit-crop-box-to-image
            :crop-output-width="608"
            :crop-output-height="342"
            :thumb-width="160"
            :thumb-height="160"
            :thumb-quality="0.75"
            @uploaded="handleCoverUploaded"
            placeholder="建议上传分辨率608*342以上的16:9图片"
          />
        </el-form-item>

        <!-- 简要描述 -->
        <el-form-item label="简要描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="选填，简要描述案例内容"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <!-- 排序值 -->
        <el-form-item label="排序值">
          <el-input-number
            v-model="form.sort"
            :min="0"
            :max="9999"
          />
          <span class="form-tip">数字越小越靠前</span>
        </el-form-item>

        <!-- 所属栏目 -->
        <el-form-item label="所属栏目" prop="categoryIds">
          <el-checkbox-group v-model="form.categoryIds" class="category-group-list">
            <div
              v-for="group in categoryGroups"
              :key="group.companyId"
              class="category-company-block"
            >
              <div class="category-company-title">{{ group.companyName }}</div>
              <div v-if="group.categories.length" class="category-checkboxes">
                <el-checkbox
                  v-for="cat in group.categories"
                  :key="cat.categoryId"
                  :label="cat.categoryId"
                >
                  {{ cat.name }}
                </el-checkbox>
              </div>
              <div v-else class="category-empty">
                暂无栏目，请先在案例列表页添加栏目
              </div>
            </div>
          </el-checkbox-group>
          <div v-if="!categoryGroups.length && form.companyIds.length" class="form-tip">
            暂无栏目，请先在案例列表页添加栏目
          </div>
          <div v-if="!form.companyIds.length" class="form-tip">
            请先选择所属公司
          </div>
        </el-form-item>

        <!-- 是否可见 -->
        <el-form-item label="是否可见">
          <el-switch v-model="form.visible" />
        </el-form-item>

        <!-- 案例详情 -->
        <el-form-item label="案例详情" prop="content">
          <TinyEditor v-model="form.content" :height="400" />
        </el-form-item>

        <!-- 底部操作 -->
        <el-form-item>
          <el-button @click="handlePreview">
            预览
          </el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">
            保存
          </el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-dialog
      v-model="previewVisible"
      title="案例预览"
      width="900px"
      destroy-on-close
    >
      <div class="preview-dialog">
        <div v-if="previewCoverUrl" class="preview-cover-wrap">
          <img :src="previewCoverUrl" alt="案例封面" class="preview-cover" />
        </div>
        <div v-else class="preview-cover-empty">暂无封面图</div>

        <div class="preview-header">
          <div class="preview-title-group">
            <h2 class="preview-title">{{ form.title || '未填写企业全称' }}</h2>
            <p class="preview-desc">{{ form.description }}</p>
          </div>

          <div v-if="previewCategoryNames.length" class="preview-section preview-category-section">
            <div class="preview-meta">
              <span
                v-for="categoryName in previewCategoryNames"
                :key="categoryName"
                class="preview-tag"
              >
                {{ categoryName }}
              </span>
            </div>
          </div>

        </div>

        <div class="preview-detail-block">
          <div v-if="previewContentHtml" class="preview-content" v-html="previewContentHtml"></div>
          <div v-else class="preview-empty">暂无案例详情内容</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { COMPANY_MAP } from '@/config/env'
import { callFunction, adminGetCategoryList } from '@/cloud/api'
import cloudApp from '@/cloud/init'
import { getTempFileURL } from '@/cloud/file'
import ImageUpload from '@/components/ImageUpload.vue'
import TinyEditor from '@/components/TinyEditor.vue'

const route = useRoute()
const router = useRouter()
const companyMap = COMPANY_MAP

const caseId = computed(() => route.params.caseId || '')
const isEdit = computed(() => !!caseId.value)

const formRef = ref(null)
const pageLoading = ref(false)
const saving = ref(false)
const pageLoadedAt = ref(null)
const previewVisible = ref(false)
const previewCoverUrl = ref('')
const previewContentHtml = ref('')

// 栏目选项（根据选中的公司动态加载）
const categoryOptions = ref([])
const categoryGroups = ref([])

const form = reactive({
  companyIds: [],
  title: '',
  cover: '',
  coverThumb: '',
  description: '',
  sort: 100,
  categoryIds: [],
  visible: true,
  content: ''
})

const rules = {
  companyIds: [
    {
      type: 'array',
      required: true,
      min: 1,
      message: '请至少选择一家公司',
      trigger: 'change'
    }
  ],
  title: [
    { required: true, message: '请输入企业全称', trigger: 'blur' },
    { min: 1, max: 50, message: '企业全称长度1-50字', trigger: 'blur' }
  ],
  cover: [
    { required: false }
  ],
  categoryIds: [
    { type: 'array', required: false }
  ],
  content: [
    { required: true, message: '请填写案例详情', trigger: 'blur' }
  ]
}

const previewCategoryNames = computed(() =>
  form.categoryIds
    .map((id) => categoryOptions.value.find((item) => item.categoryId === id)?.name)
    .filter(Boolean)
)

function decodeHtmlAttr(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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

function normalizePreviewDocument(doc) {
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

  return doc
}

async function resolvePreviewContent(content = '') {
  if (!content) return ''

  if (typeof window === 'undefined' || !window.DOMParser) {
    return content
  }

  const fileIds = Array.from(new Set(content.match(/cloud:\/\/[^\s"'<>]+/g) || []))
  let urlMap = new Map()
  if (fileIds.length) {
    try {
      const res = await cloudApp.getTempFileURL({ fileList: fileIds })
      urlMap = new Map(
        (res.fileList || [])
          .filter((item) => item?.fileID && item?.tempFileURL)
          .map((item) => [item.fileID, item.tempFileURL])
      )
    } catch {}
  }

  const doc = new window.DOMParser().parseFromString(content, 'text/html')
  doc.querySelectorAll('img').forEach((img) => {
    const src = decodeHtmlAttr(img.getAttribute('src') || '')
    const dataCloudFileId = decodeHtmlAttr(img.getAttribute('data-cloud-file-id') || '')
    const fileID = dataCloudFileId.startsWith('cloud://')
      ? dataCloudFileId
      : (src.startsWith('cloud://') ? src : '')
    if (!fileID) return
    const tempUrl = urlMap.get(fileID)
    if (tempUrl) {
      img.setAttribute('src', tempUrl)
    }
    img.setAttribute('data-cloud-file-id', fileID)
    const currentStyle = (img.getAttribute('style') || '').trim().replace(/;+\s*$/, '')
    const mergedStyle = currentStyle
      ? `${currentStyle};max-width:100%;height:auto;display:block`
      : 'max-width:100%;height:auto;display:block'
    img.setAttribute('style', mergedStyle)
  })
  return normalizePreviewDocument(doc).body.innerHTML
}

// 监听所属公司变化 → 动态加载栏目
watch(
  () => form.companyIds,
  async (ids) => {
    if (!ids.length) {
      categoryOptions.value = []
      categoryGroups.value = []
      return
    }
    try {
      // 按公司分组保留栏目来源，避免同名栏目混在一起看不清。
      const results = await Promise.all(
        ids.map((id) => adminGetCategoryList(id).catch(() => []))
      )
      const groups = ids.map((companyId, index) => {
        const data = results[index]
        const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : [])
        const companyName = companyMap[companyId] || companyId

        return {
          companyId,
          companyName,
          categories: list.map((cat) => ({
            ...cat,
            companyId,
            companyName
          }))
        }
      })
      categoryGroups.value = groups
      categoryOptions.value = groups.flatMap((group) => group.categories)

      // 移除已不存在的栏目选中
      const validIds = new Set(categoryOptions.value.map((c) => c.categoryId))
      form.categoryIds = form.categoryIds.filter((id) => validIds.has(id))
    } catch {
      categoryOptions.value = []
      categoryGroups.value = []
    }
  },
  { deep: true }
)

watch(
  () => form.cover,
  () => {
    if (previewVisible.value) {
      syncPreviewCover()
    }
  }
)

watch(
  () => form.content,
  () => {
    if (previewVisible.value) {
      resolvePreviewContent(form.content || '').then((html) => {
        previewContentHtml.value = html
      })
    }
  }
)

// 编辑模式 → 加载数据回显
async function loadCaseData() {
  pageLoading.value = true
  try {
    const data = await callFunction('adminGetCase', { caseId: caseId.value })
    form.companyIds = data.companyIds || []
    form.title = data.title || ''
    form.cover = data.cover || ''
    form.coverThumb = data.coverThumb || ''
    form.description = data.description || ''
    form.sort = data.sort ?? 100
    form.categoryIds = data.categoryIds || []
    form.visible = data.visible !== false
    form.content = data.content || ''
    // 记录加载时间用于并发保护
    pageLoadedAt.value = data.updatedAt || Date.now()
  } catch {
    ElMessage.error('加载案例数据失败')
    router.push('/cases')
  } finally {
    pageLoading.value = false
  }
}

async function syncPreviewCover() {
  previewCoverUrl.value = await getTempFileURL(form.cover || '')
}

function handleCoverUploaded({ fileID, thumbFileID }) {
  form.coverThumb = fileID ? (thumbFileID || '') : ''
}

async function handlePreview() {
  await syncPreviewCover()
  previewContentHtml.value = await resolvePreviewContent(form.content || '')
  previewVisible.value = true
}

// 保存
async function handleSave() {
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
  } catch {
    return
  }

  saving.value = true
  try {
    const fields = {
      companyIds: form.companyIds,
      title: form.title.trim(),
      cover: form.cover,
      coverThumb: form.coverThumb,
      description: form.description.trim(),
      sort: form.sort,
      categoryIds: form.categoryIds,
      visible: form.visible,
      content: form.content
    }

    if (isEdit.value) {
      await callFunction('adminUpdateCase', {
        caseId: caseId.value,
        fields,
        pageLoadedAt: pageLoadedAt.value
      })
    } else {
      await callFunction('adminCreateCase', fields)
    }
    ElMessage.success(isEdit.value ? '保存成功' : '创建成功')
    router.push('/cases')
  } catch {
    // api.js 已统一处理错误提示
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  router.push('/cases')
}

onMounted(() => {
  if (isEdit.value) {
    loadCaseData()
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.case-edit-page {
  .card-wrapper {
    max-width: 800px;
  }

  .form-tip {
    margin-left: 12px;
    font-size: 12px;
    color: $text-auxiliary;
  }

  .category-group-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .category-company-block {
    padding: 12px 14px;
    border: 1px solid $border-color;
    border-radius: 10px;
    background: #fafbfc;
  }

  .category-company-title {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
  }

  .category-checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
  }

  .category-empty {
    font-size: 12px;
    color: $text-auxiliary;
  }

  .preview-dialog {
    overflow: hidden;
    border: 1px solid rgba(22, 119, 255, 0.08);
    border-radius: $radius-card;
    background: linear-gradient(180deg, rgba(22, 119, 255, 0.04) 0%, #ffffff 100%);
  }

  .preview-cover-wrap {
    aspect-ratio: 16 / 9;
    background: rgba(22, 119, 255, 0.08);
  }

  .preview-cover {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .preview-cover-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 16 / 9;
    background: #f5f6fa;
    color: $text-auxiliary;
    font-size: 15px;
  }

  .preview-header {
    padding: 28px 24px 0;
  }

  .preview-section {
    margin-bottom: 18px;
  }

  .preview-detail-block {
    padding: 8px 24px 28px;
  }

  .preview-title {
    margin: 0;
    color: $text-primary;
    font-size: 28px;
    line-height: 1.4;
  }

  .preview-title-group {
    margin-bottom: 24px;
  }

  .preview-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .preview-tag {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(22, 119, 255, 0.08);
    color: $color-primary;
    font-size: 13px;
  }

  .preview-desc {
    margin: 8px 0 0;
    color: $text-secondary;
    font-size: 15px;
    line-height: 1.8;
  }

  .preview-category-section {
    margin-bottom: 30px;
  }

  .preview-content,
  .preview-empty {
    padding: 0;
  }

  .preview-empty {
    color: $text-auxiliary;
    font-size: 15px;
  }

  .preview-content {
    color: $text-primary;
    font-size: 15px;
    line-height: 1.5;

    :deep(img) {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 16px auto;
      border-radius: 12px;
    }

    :deep(p) {
      margin: 0 0 14px;
    }

    :deep(p:last-child) {
      margin-bottom: 0;
    }

    :deep(h1) {
      margin: 24px 0 12px;
      color: $text-primary;
      line-height: 1.5;
    }

    :deep(h2) {
      margin: 24px 0 12px;
      color: $text-primary;
      font-size: 17px;
      line-height: 2.5;
    }

    :deep(h3) {
      margin: 24px 0 12px;
      color: $text-primary;
      font-size: 19px;
      line-height: 2.5;
    }

    :deep(ul),
    :deep(ol) {
      margin: 0 0 14px;
      padding-left: 20px;
    }
  }
}
</style>
