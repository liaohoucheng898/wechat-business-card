<template>
  <div class="company-list-page">
    <div class="page-header">
      <div class="title-block">
        <h1 class="page-title">公司管理</h1>
        <p class="page-desc">维护固定公司的基础资料、联系方式和小程序首页展示信息。</p>
      </div>
    </div>

    <div class="admin-toolbar">
      <span>固定 3 家公司 · 公司资料会影响小程序客户首页展示</span>
      <span class="text-muted">编辑后请在小程序端人工核对展示效果</span>
    </div>

    <div class="card-wrapper">
      <el-table :data="companyList" v-loading="loading" stripe>
        <el-table-column label="公司" min-width="220">
          <template #default="{ row }">
            <div class="company-cell">
              <el-avatar
                :size="40"
                shape="square"
                :src="row.logo"
                class="company-logo"
              >
                <span class="logo-placeholder">{{ row.name?.charAt(0) || '-' }}</span>
              </el-avatar>
              <div class="company-meta">
                <span class="company-name">{{ row.name || '-' }}</span>
                <span class="company-id">{{ row.companyId }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="资料完整度" min-width="220">
          <template #default="{ row }">
            <div class="completeness-cell">
              <el-tag
                :type="getCompanyCompleteness(row).complete ? 'success' : 'warning'"
                size="small"
                effect="plain"
              >
                {{ getCompanyCompleteness(row).complete ? '完整' : `缺 ${getCompanyCompleteness(row).missing.length} 项` }}
              </el-tag>
              <span
                v-if="!getCompanyCompleteness(row).complete"
                class="missing-text"
              >
                {{ getCompanyCompleteness(row).missing.join('、') }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="定位" min-width="180">
          <template #default="{ row }">
            <div class="location-cell">
              <el-tag
                :type="hasCompanyLocation(row) ? 'success' : 'info'"
                size="small"
                effect="plain"
              >
                {{ hasCompanyLocation(row) ? '已设置' : '未设置' }}
              </el-tag>
              <span v-if="hasCompanyLocation(row)" class="location-text">
                {{ getLocationText(row) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="联系电话" min-width="150">
          <template #default="{ row }">
            <span>{{ row.phone || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" min-width="170">
          <template #default="{ row }">
            <span class="num-cell">{{ formatDateTime(row.updatedAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goEdit(row.companyId)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { COMPANY_MAP } from '@/config/env'
import { adminGetCompanyList } from '@/cloud/api'
import { mapTempFileURLs } from '@/cloud/file'

const router = useRouter()

// 固定三家公司，初始数据从 COMPANY_MAP 构建
const companyList = ref(
  Object.entries(COMPANY_MAP).map(([id, name]) => ({
    companyId: id,
    name,
    logo: '',
    intro: ''
  }))
)
const loading = ref(false)
const RICH_TEXT_MEDIA_RE = /<(img|video|iframe)\b/i
const BR_TAG_RE = /<br\s*\/?>/gi
const HTML_TAG_RE = /<[^>]*>/g
const BLANK_ENTITY_RE =
  /&nbsp;|&amp;nbsp;|&#160;|&#x[aA]0;|&#12288;|&#x3000;|&ensp;|&emsp;|&thinsp;/gi

async function fetchCompanies() {
  loading.value = true
  try {
    const data = await adminGetCompanyList()
    const list = await mapTempFileURLs(data.list || data || [], 'logo')
    // 用接口返回覆盖
    companyList.value = companyList.value.map(c => {
      const remote = list.find(r => r.companyId === c.companyId)
      return remote ? { ...c, ...remote } : c
    })
  } catch {
    // 接口失败时使用本地默认数据
  } finally {
    loading.value = false
  }
}

function hasMeaningfulRichText(value) {
  const html = String(value || '')
  if (!html.trim()) return false
  if (RICH_TEXT_MEDIA_RE.test(html)) return true

  const text = html
    .replace(BR_TAG_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(BLANK_ENTITY_RE, ' ')
    .replace(/[\u00a0\u3000\u200B-\u200D\uFEFF]/g, '')
    .trim()

  return Boolean(text)
}

function hasTextValue(value) {
  return Boolean(String(value || '').trim())
}

function hasCompanyLogo(company) {
  return hasTextValue(company.logoSource || company.logoRaw || company.logo)
}

function getCompanyCompleteness(company) {
  const missing = []
  if (!hasMeaningfulRichText(company.intro)) missing.push('公司简介')
  if (!hasMeaningfulRichText(company.businessIntro)) missing.push('业务介绍')
  if (!hasCompanyLogo(company)) missing.push('Logo')
  if (!hasTextValue(company.address)) missing.push('地址')
  if (!hasTextValue(company.phone)) missing.push('电话')
  return {
    complete: missing.length === 0,
    missing
  }
}

function getFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getLocationParts(company) {
  const lat =
    getFiniteNumber(company.latitude) ??
    getFiniteNumber(company.location?.lat) ??
    getFiniteNumber(company.location?.latitude)
  const lng =
    getFiniteNumber(company.longitude) ??
    getFiniteNumber(company.location?.lng) ??
    getFiniteNumber(company.location?.longitude)
  return { lat, lng }
}

function hasCompanyLocation(company) {
  const { lat, lng } = getLocationParts(company)
  return (
    hasTextValue(company.locationName || company.location?.name) ||
    (typeof lat === 'number' && typeof lng === 'number')
  )
}

function getLocationText(company) {
  if (hasTextValue(company.locationName)) return company.locationName.trim()
  if (hasTextValue(company.location?.name)) return company.location.name.trim()
  const { lat, lng } = getLocationParts(company)
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
  return '-'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function goEdit(companyId) {
  router.push({
    name: 'CompanyEdit',
    params: { companyId }
  })
}

onMounted(() => {
  fetchCompanies()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.company-list-page {
  .title-block {
    min-width: 0;
  }

  .company-cell {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    min-width: 0;
  }

  .company-logo {
    flex: 0 0 auto;
    border: 1px solid $border-color;
    border-radius: $radius-button;
    background: $surface-inset;
  }

  .logo-placeholder {
    font-size: 16px;
    font-weight: 600;
    color: $text-auxiliary;
  }

  .company-meta,
  .completeness-cell,
  .location-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .company-name {
    color: $text-primary;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .company-id,
  .missing-text,
  .location-text {
    color: $text-auxiliary;
    font-size: 12px;
    line-height: 18px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .missing-text,
  .location-text {
    max-width: 180px;
  }
}
</style>
