<template>
  <div class="company-edit-page">
    <div class="page-header">
      <div class="title-block">
        <h1 class="page-title">编辑公司</h1>
      </div>
      <div class="page-actions">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          取消
        </el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          <el-icon><Check /></el-icon>
          保存公司资料
        </el-button>
      </div>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      v-loading="loading"
      class="edit-form"
    >
      <section class="admin-panel form-section">
        <div class="section-header">
          <div>
            <h2>{{ form.name || '公司资料' }}</h2>
          </div>
        </div>
        <div class="form-grid company-main-grid">
          <el-form-item label="公司名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入公司名称" maxlength="30" show-word-limit />
          </el-form-item>

          <el-form-item label="公司电话">
            <el-input v-model="form.phone" placeholder="请输入公司电话" maxlength="20" />
          </el-form-item>

          <el-form-item label="公司地址">
            <el-input v-model="form.address" placeholder="请输入公司地址" maxlength="100" />
          </el-form-item>

          <el-form-item label="公司定位" class="location-form-item">
            <div class="location-field">
              <el-input
                :model-value="locationText"
                placeholder="点击选择定位"
                readonly
                @click="mapPickerVisible = true"
              >
                <template #suffix>
                  <el-icon class="location-icon"><Location /></el-icon>
                </template>
              </el-input>
              <el-button
                v-if="form.location?.lat"
                text
                type="danger"
                size="small"
                @click="clearLocation"
              >
                清除
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="公司简介" class="form-row-full">
            <TinyEditor v-model="form.intro" :height="300" />
          </el-form-item>

          <el-form-item label="业务介绍" class="form-row-full">
            <TinyEditor v-model="form.businessIntro" :height="300" />
          </el-form-item>
        </div>
      </section>

      <section class="admin-panel form-section">
        <div class="section-header">
          <div>
            <h2>更多资料</h2>
          </div>
        </div>
        <div class="form-grid support-grid">
          <el-form-item label="公司Logo">
            <ImageUpload
              v-model="form.logo"
              ratio="1:1"
              :width="100"
              placeholder="上传Logo"
            />
          </el-form-item>

          <el-form-item label="公司官网">
            <el-input v-model="form.website" placeholder="https://" maxlength="200" />
          </el-form-item>
        </div>
      </section>
    </el-form>

    <MapPicker
      v-model:visible="mapPickerVisible"
      :value="form.location"
      @confirm="onMapConfirm"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Location } from '@element-plus/icons-vue'
import { adminGetCompany, adminUpdateCompany } from '@/cloud/api'
import ImageUpload from '@/components/ImageUpload.vue'
import TinyEditor from '@/components/TinyEditor.vue'
import MapPicker from '@/components/MapPicker.vue'

const route = useRoute()
const router = useRouter()
const companyId = route.params.companyId

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const mapPickerVisible = ref(false)
const pageLoadedAt = ref(null)

const form = reactive({
  name: '',
  logo: '',
  intro: '',
  businessIntro: '',
  address: '',
  phone: '',
  location: { lat: null, lng: null, name: '', address: '' },
  website: ''
})

const rules = {
  name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }]
}

const locationText = computed(() => {
  if (!form.location?.lat) return ''
  return form.location.name || `${form.location.lat.toFixed(6)}, ${form.location.lng.toFixed(6)}`
})

async function fetchData() {
  loading.value = true
  try {
    const data = await adminGetCompany(companyId)
    form.name = data.name || ''
    form.logo = data.logo || ''
    form.intro = data.intro || ''
    form.businessIntro = data.businessIntro || ''
    form.address = data.address || ''
    form.phone = data.phone || ''
    form.location = {
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lng: typeof data.longitude === 'number' ? data.longitude : null,
      name: data.locationName || '',
      address: data.address || ''
    }
    form.website = data.website || ''
    pageLoadedAt.value = data.updatedAt || Date.now()
  } catch {
    // 新公司或接口错误
    pageLoadedAt.value = Date.now()
  } finally {
    loading.value = false
  }
}

function onMapConfirm(loc) {
  form.location = { ...loc }
}

function clearLocation() {
  form.location = { lat: null, lng: null, name: '', address: '' }
}

function buildLocationFields() {
  const lat = form.location?.lat
  const lng = form.location?.lng

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return {}
  }

  const fallbackName = form.location.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`

  return {
    latitude: lat,
    longitude: lng,
    locationName: (form.location.name || fallbackName).trim()
  }
}

async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await adminUpdateCompany(companyId, {
      name: form.name,
      logo: form.logo,
      intro: form.intro,
      businessIntro: form.businessIntro,
      address: form.address,
      phone: form.phone,
      website: form.website,
      ...buildLocationFields()
    }, pageLoadedAt.value)

    ElMessage.success('保存成功')
    router.push('/company')
  } catch {
    // api.js 已统一处理错误
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/company')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.company-edit-page {
  .title-block {
    min-width: 0;
  }

  .page-actions {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    flex: 0 0 auto;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: $spacing-base;
  }

  .form-section {
    padding: $spacing-xl;
  }

  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $spacing-base;
    margin-bottom: $spacing-lg;

    h2 {
      margin: 0;
      color: $text-primary;
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
    }
  }

  .form-grid {
    display: grid;
    gap: $spacing-base $spacing-xl;
  }

  .company-main-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .support-grid {
    grid-template-columns: 180px minmax(0, 1fr);
    align-items: start;
  }

  .form-row-full,
  .location-form-item {
    grid-column: 1 / -1;
  }

  .location-field {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    width: 100%;

    .el-input {
      flex: 1;
      cursor: pointer;
    }

    .location-icon {
      color: $color-primary;
      cursor: pointer;
    }
  }

  :deep(.tox-tinymce) {
    border-radius: $radius-card;
  }

  @media (max-width: 900px) {
    .page-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .page-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .company-main-grid,
    .support-grid {
      grid-template-columns: 1fr;
    }

    .form-section {
      padding: $spacing-base;
    }
  }
}
</style>
