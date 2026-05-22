<template>
  <div class="cases-list-page">
    <div class="page-header">
      <div class="title-block">
        <h1 class="page-title">内容中心</h1>
      </div>
      <div class="page-actions">
        <el-button plain @click="categoryDialogVisible = true">栏目管理</el-button>
        <el-button type="primary" @click="goEdit()">
          <el-icon><Plus /></el-icon>
          新增案例
        </el-button>
      </div>
    </div>

    <CompanyTabs v-model="filterCompanyId" @change="fetchCases" />

    <div class="admin-filter-panel">
      <el-input v-model="keyword" clearable placeholder="搜索企业全称" style="width: 220px" />
      <el-select v-model="visibleStatus" clearable placeholder="可见状态" style="width: 140px">
        <el-option label="可见" value="visible" />
        <el-option label="隐藏" value="hidden" />
      </el-select>
      <el-select v-model="categoryStatus" clearable placeholder="栏目状态" style="width: 140px">
        <el-option label="已有栏目" value="hasCategory" />
        <el-option label="缺少栏目" value="missing" />
      </el-select>
      <el-button type="primary" plain @click="fetchCases">查询</el-button>
      <el-button @click="handleResetFilters">重置</el-button>
    </div>

    <div class="admin-toolbar">
      <span>共 {{ filteredCaseList.length }} 条案例</span>
    </div>

    <div class="card-wrapper">
      <el-table :data="filteredCaseList" v-loading="loading" stripe>
        <el-table-column label="案例" min-width="260">
          <template #default="{ row }">
            <div class="object-cell">
              <span class="object-thumb">
                <img v-if="row.cover" :src="row.cover" alt="案例封面">
                <span v-else>案</span>
              </span>
              <div class="object-main">
                <div class="object-title">{{ row.title || '未填写企业全称' }}</div>
                <div class="object-sub">{{ row.description || '暂无简要描述' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="所属公司" min-width="160">
          <template #default="{ row }">
            <el-tag
              v-for="id in (row.companyIds || [])"
              :key="id"
              size="small"
              class="list-tag"
            >
              {{ getCompanyName(id) }}
            </el-tag>
            <span v-if="!row.companyIds?.length" class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="所属栏目" min-width="160">
          <template #default="{ row }">
            <el-tag
              v-for="cat in (row.categories || [])"
              :key="cat.categoryId"
              type="info"
              size="small"
              class="list-tag"
            >
              {{ cat.name }}
            </el-tag>
            <span v-if="!row.categories?.length" class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="sort" label="排序" width="80" align="center" />

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <span class="status-inline">
              <el-tag :type="row.visible !== false ? 'success' : 'info'" size="small" effect="plain">
                {{ row.visible !== false ? '可见' : '隐藏' }}
              </el-tag>
              <el-switch
                :model-value="row.visible !== false"
                size="small"
                @change="(val) => handleToggleVisible(row, val)"
              />
            </span>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">
            <span class="num-cell">{{ formatCaseUpdatedAt(row) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handlePreview(row)">
              预览
            </el-button>
            <el-button type="primary" link size="small" @click="goEdit(row.caseId)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="categoryDialogVisible"
      title="栏目管理"
      width="640px"
      destroy-on-close
      @open="onCategoryDialogOpen"
    >
      <el-tabs v-model="catActiveTab" @tab-change="fetchCategories">
        <el-tab-pane
          v-for="(name, id) in companyMap"
          :key="id"
          :label="name"
          :name="id"
        />
      </el-tabs>

      <el-table :data="categoryList" v-loading="catLoading" size="small">
        <el-table-column type="index" label="序号" width="60" align="center" />

        <el-table-column label="栏目名称" min-width="180">
          <template #default="{ row }">
            <el-input
              v-if="editingCategoryId === row.categoryId"
              v-model="editingCategoryName"
              size="small"
              maxlength="10"
            />
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="排序" width="120" align="center">
          <template #default="{ row }">
            <el-input-number
              v-if="editingCategoryId === row.categoryId"
              v-model="editingCategorySort"
              :min="0"
              :max="9999"
              size="small"
            />
            <span v-else>{{ row.sort }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <template v-if="editingCategoryId === row.categoryId">
              <el-button type="primary" link size="small" :loading="catSaving" @click="handleUpdateCategory(row)">
                保存
              </el-button>
              <el-button link size="small" @click="handleCancelEditCategory">
                取消
              </el-button>
            </template>
            <template v-else>
              <el-button type="primary" link size="small" @click="handleEditCategory(row)">
                编辑
              </el-button>
              <el-button type="danger" link size="small" @click="handleDeleteCategory(row)">
                删除
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="add-category-row">
        <el-input
          v-model="newCategoryName"
          placeholder="输入栏目名称"
          size="small"
          class="cat-input"
          maxlength="10"
          @keyup.enter="handleAddCategory"
        />
        <el-input-number
          v-model="newCategorySort"
          :min="0"
          :max="9999"
          size="small"
          placeholder="排序"
          class="cat-sort"
        />
        <el-button
          type="primary"
          size="small"
          :loading="catSaving"
          @click="handleAddCategory"
        >
          添加
        </el-button>
      </div>
    </el-dialog>

    <el-dialog
      v-model="previewVisible"
      title="案例预览"
      width="900px"
      destroy-on-close
    >
      <div v-loading="previewLoading" class="preview-dialog">
        <div v-if="previewData.cover" class="preview-cover-wrap">
          <img :src="previewData.cover" alt="案例封面" class="preview-cover" />
        </div>
        <div v-else class="preview-cover-empty">暂无封面图</div>

        <div class="preview-header">
          <div class="preview-title-group">
            <h2 class="preview-title">{{ previewData.title || '未填写企业全称' }}</h2>
            <p v-if="previewData.description" class="preview-desc">{{ previewData.description }}</p>
          </div>

          <div v-if="previewData.categoryNames.length" class="preview-section preview-category-section">
            <div class="preview-meta">
              <span
                v-for="categoryName in previewData.categoryNames"
                :key="categoryName"
                class="preview-tag"
              >
                {{ categoryName }}
              </span>
            </div>
          </div>
        </div>

        <div class="preview-detail-block">
          <div v-if="previewData.content" class="preview-content" v-html="previewData.content"></div>
          <div v-else class="preview-empty">暂无案例详情内容</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { COMPANY_MAP } from '@/config/env'
import cloudApp from '@/cloud/init'
import { getTempFileURL, mapTempFileURLs } from '@/cloud/file'
import {
  adminGetCase,
  adminGetCaseList,
  adminDeleteCase,
  adminToggleCaseVisible,
  adminManageCategory,
  adminGetCategoryList
} from '@/cloud/api'
import CompanyTabs from '@/components/CompanyTabs.vue'

const router = useRouter()
const companyMap = COMPANY_MAP

const loading = ref(false)
const caseList = ref([])
const filterCompanyId = ref('')
const keyword = ref('')
const visibleStatus = ref('')
const categoryStatus = ref('')
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewData = ref({
  title: '',
  description: '',
  cover: '',
  categoryNames: [],
  content: '',
})

const categoryDialogVisible = ref(false)
const catActiveTab = ref(Object.keys(COMPANY_MAP)[0])
const categoryList = ref([])
const catLoading = ref(false)
const catSaving = ref(false)
const newCategoryName = ref('')
const newCategorySort = ref(0)
const editingCategoryId = ref('')
const editingCategoryName = ref('')
const editingCategorySort = ref(0)

const filteredCaseList = computed(() => {
  return caseList.value.filter((item) => {
    const keywordMatched = !keyword.value || String(item.title || '').includes(keyword.value.trim())
    const visibleMatched =
      !visibleStatus.value ||
      (visibleStatus.value === 'visible' && item.visible !== false) ||
      (visibleStatus.value === 'hidden' && item.visible === false)
    const categoryMatched =
      !categoryStatus.value ||
      (categoryStatus.value === 'missing' && !item.categories?.length) ||
      (categoryStatus.value === 'hasCategory' && !!item.categories?.length)
    return keywordMatched && visibleMatched && categoryMatched
  })
})

function getCompanyName(id) {
  return COMPANY_MAP[id] || id
}

function formatCaseUpdatedAt(row = {}) {
  const value = row.updatedAt || row.updateTime || row.createdAt || ''
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function handleResetFilters() {
  keyword.value = ''
  visibleStatus.value = ''
  categoryStatus.value = ''
}

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

async function fetchCases() {
  loading.value = true
  try {
    const params = {}
    if (filterCompanyId.value) {
      params.companyId = filterCompanyId.value
    }
    const data = await adminGetCaseList(params)
    caseList.value = await mapTempFileURLs(data.list || [], 'cover')
  } catch {
    // api.js 已统一处理错误
  } finally {
    loading.value = false
  }
}

function goEdit(caseId) {
  if (caseId) {
    router.push({
      name: 'CaseEdit',
      params: { caseId }
    })
  } else {
    router.push({ name: 'CaseEdit' })
  }
}

async function handlePreview(row) {
  previewVisible.value = true
  previewLoading.value = true
  previewData.value = {
    title: row.title || '',
    description: row.description || '',
    cover: row.cover || '',
    categoryNames: (row.categories || []).map((item) => item.name).filter(Boolean),
    content: '',
  }

  try {
    const data = await adminGetCase(row.caseId)
    previewData.value = {
      title: data.title || row.title || '',
      description: data.description || row.description || '',
      cover: await getTempFileURL(data.cover || row.cover || ''),
      categoryNames: (row.categories || []).map((item) => item.name).filter(Boolean),
      content: await resolvePreviewContent(data.content || ''),
    }
  } catch {
    previewVisible.value = false
  } finally {
    previewLoading.value = false
  }
}

async function handleToggleVisible(row, val) {
  try {
    await adminToggleCaseVisible(row.caseId, val)
    row.visible = val
    ElMessage.success(val ? '已设为可见' : '已设为隐藏')
  } catch {
    // 失败时不改本地状态
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除案例「${row.title}」吗？删除后该案例不会在小程序展示，后台不可直接恢复。`,
      '删除案例确认',
      { confirmButtonText: '确认删除案例', cancelButtonText: '取消', type: 'warning' }
    )
    await adminDeleteCase(row.caseId)
    ElMessage.success('已删除')
    fetchCases()
  } catch {
    // 取消或失败
  }
}

async function fetchCategories() {
  catLoading.value = true
  try {
    const data = await adminGetCategoryList(catActiveTab.value)
    categoryList.value = data.list || []
  } catch {
    categoryList.value = []
  } finally {
    catLoading.value = false
  }
}

function handleEditCategory(row) {
  editingCategoryId.value = row.categoryId
  editingCategoryName.value = row.name || ''
  editingCategorySort.value = typeof row.sort === 'number' ? row.sort : 0
}

function handleCancelEditCategory() {
  editingCategoryId.value = ''
  editingCategoryName.value = ''
  editingCategorySort.value = 0
}

async function handleAddCategory() {
  if (!newCategoryName.value.trim()) {
    ElMessage.warning('请输入栏目名称')
    return
  }

  catSaving.value = true
  try {
    await adminManageCategory('create', {
      companyId: catActiveTab.value,
      name: newCategoryName.value.trim(),
      sort: newCategorySort.value
    })
    ElMessage.success('添加成功')
    newCategoryName.value = ''
    newCategorySort.value = 0
    fetchCategories()
  } catch {
    // api.js 已统一处理
  } finally {
    catSaving.value = false
  }
}

async function handleUpdateCategory(row) {
  if (!editingCategoryName.value.trim()) {
    ElMessage.warning('请输入栏目名称')
    return
  }

  catSaving.value = true
  try {
    await adminManageCategory('update', {
      companyId: catActiveTab.value,
      categoryId: row.categoryId,
      name: editingCategoryName.value.trim(),
      sort: editingCategorySort.value
    })
    ElMessage.success('保存成功')
    handleCancelEditCategory()
    fetchCategories()
  } catch {
    // api.js 已统一处理
  } finally {
    catSaving.value = false
  }
}

async function handleDeleteCategory(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除栏目「${row.name}」？`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    await adminManageCategory('delete', { categoryId: row.categoryId })
    ElMessage.success('已删除')
    fetchCategories()
  } catch {
    // 取消或失败
  }
}

const onCategoryDialogOpen = () => {
  handleCancelEditCategory()
  fetchCategories()
}

onMounted(() => {
  fetchCases()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.cases-list-page {
  .page-actions {
    display: flex;
    gap: 12px;
  }

  .cover-img {
    width: 80px;
    height: 45px;
    border-radius: $radius-tag;
    object-fit: cover;
  }

  .list-tag {
    margin-right: 4px;
    margin-bottom: 4px;
  }

  .text-muted {
    color: $text-auxiliary;
    font-size: 13px;
  }

  .add-category-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid $border-color;

    .cat-input {
      flex: 1;
    }

    .cat-sort {
      width: 120px;
    }
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

  .preview-title-group {
    margin-bottom: 24px;
  }

  .preview-title {
    margin: 0;
    color: $text-primary;
    font-size: 28px;
    line-height: 1.4;
  }

  .preview-desc {
    margin: 8px 0 0;
    color: $text-secondary;
    font-size: 15px;
    line-height: 1.8;
  }

  .preview-section {
    margin-bottom: 18px;
  }

  .preview-category-section {
    margin-bottom: 30px;
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

  .preview-detail-block {
    padding: 8px 24px 28px;
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
