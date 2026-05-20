<template>
  <div class="company-edit-page">
    <!-- 面包屑 -->
    <el-breadcrumb separator="/" class="breadcrumb">
      <el-breadcrumb-item :to="{ path: '/company' }">公司管理</el-breadcrumb-item>
      <el-breadcrumb-item>编辑公司</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="card-wrapper">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        v-loading="loading"
        class="edit-form"
      >
        <!-- 公司名称 -->
        <el-form-item label="公司名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入公司名称" maxlength="30" show-word-limit />
        </el-form-item>

        <!-- Logo -->
        <el-form-item label="公司Logo">
          <ImageUpload
            v-model="form.logo"
            ratio="1:1"
            :width="100"
            placeholder="上传Logo"
          />
        </el-form-item>

        <!-- 公司简介 -->
        <el-form-item label="公司简介">
          <TinyEditor v-model="form.intro" :height="300" />
        </el-form-item>

        <!-- 业务介绍 -->
        <el-form-item label="业务介绍">
          <TinyEditor v-model="form.businessIntro" :height="300" />
        </el-form-item>

        <!-- 公司地址 -->
        <el-form-item label="公司地址">
          <el-input v-model="form.address" placeholder="请输入公司地址" maxlength="100" />
        </el-form-item>

        <!-- 公司电话 -->
        <el-form-item label="公司电话">
          <el-input v-model="form.phone" placeholder="请输入公司电话" maxlength="20" />
        </el-form-item>

        <!-- 公司定位 -->
        <el-form-item label="公司定位">
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

        <!-- 公司官网 -->
        <el-form-item label="公司官网">
          <el-input v-model="form.website" placeholder="https://" maxlength="200" />
        </el-form-item>
      </el-form>

      <!-- 底部按钮 -->
      <div class="form-footer">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </div>
    </div>

    <!-- 地图选点弹窗 -->
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
import { Location } from '@element-plus/icons-vue'
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
  .breadcrumb {
    margin-bottom: $spacing-lg;
  }

  .card-wrapper {
    background: $card-bg;
    border-radius: $radius-card;
    padding: $spacing-xl;
    box-shadow: $shadow-card;
  }

  .edit-form {
    max-width: 680px;

    .location-field {
      display: flex;
      align-items: center;
      gap: 8px;
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
  }

  .form-footer {
    margin-top: $spacing-xl;
    padding-top: $spacing-lg;
    border-top: 1px solid $border-color;
    display: flex;
    gap: 12px;
  }
}
</style>
