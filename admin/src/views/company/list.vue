<template>
  <div class="company-list-page">
    <div class="page-header">
      <div class="title-block">
        <h1 class="page-title">公司管理</h1>
      </div>
    </div>

    <div class="admin-toolbar">
      <span>共 {{ companyList.length }} 家公司</span>
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
                <span class="company-sub">{{ row.address || '暂无地址' }}</span>
              </div>
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

        <el-table-column label="官网" min-width="220">
          <template #default="{ row }">
            <a
              v-if="hasTextValue(row.website)"
              :href="getWebsiteHref(row.website)"
              target="_blank"
              rel="noopener noreferrer"
              class="website-link"
            >
              {{ row.website }}
            </a>
            <span v-else class="text-muted">-</span>
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
    address: '',
    website: ''
  }))
)
const loading = ref(false)

async function fetchCompanies() {
  loading.value = true
  try {
    const data = await adminGetCompanyList({ loading: false })
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

function hasTextValue(value) {
  return Boolean(String(value || '').trim())
}

function getFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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

function getWebsiteHref(value) {
  const website = String(value || '').trim()
  if (/^https?:\/\//i.test(website)) return website
  return `https://${website}`
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

  .company-sub,
  .location-text {
    color: $text-auxiliary;
    font-size: 12px;
    line-height: 18px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .location-text {
    max-width: 180px;
  }

  .company-sub {
    max-width: 220px;
  }

  .website-link {
    display: inline-block;
    max-width: 220px;
    color: $color-primary;
    font-size: 13px;
    line-height: 20px;
    overflow: hidden;
    text-decoration: none;
    text-overflow: ellipsis;
    vertical-align: middle;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
