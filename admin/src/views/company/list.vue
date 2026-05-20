<template>
  <div class="company-list-page">
    <div class="page-header">
      <span class="page-title">公司管理</span>
    </div>

    <div class="card-grid">
      <el-card
        v-for="company in companyList"
        :key="company.companyId"
        shadow="hover"
        class="company-card"
      >
        <div class="card-body">
          <el-avatar
            :size="80"
            shape="square"
            :src="company.logo"
            class="company-logo"
          >
            <span class="logo-placeholder">{{ company.name?.charAt(0) }}</span>
          </el-avatar>
          <div class="company-info">
            <h3 class="company-name">{{ company.name }}</h3>
            <p class="company-desc">{{ company.intro || '暂无简介' }}</p>
          </div>
          <el-button
            type="primary"
            plain
            size="small"
            @click="goEdit(company.companyId)"
          >
            编辑
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { COMPANY_IDS, COMPANY_MAP } from '@/config/env'
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

async function fetchCompanies() {
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
  }
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
  .card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-lg;
  }

  .company-card {
    border-radius: $radius-card;

    .card-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-md;
      padding: $spacing-md 0;

      .company-logo {
        border-radius: $radius-button;
        background: $page-bg;

        .logo-placeholder {
          font-size: 28px;
          font-weight: 600;
          color: $text-auxiliary;
        }
      }

      .company-info {
        text-align: center;

        .company-name {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 6px;
        }

        .company-desc {
          font-size: 13px;
          color: $text-auxiliary;
          margin: 0;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
}
</style>
