<template>
  <el-drawer
    :model-value="visible"
    :title="isEdit ? '编辑员工' : '新增员工'"
    direction="rtl"
    size="480px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @open="onOpen"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="staff-form"
    >
      <el-form-item label="头像" prop="avatar">
        <ImageUpload
          v-model="form.avatar"
          ratio="1:1"
          :width="100"
          placeholder="上传头像"
          @uploaded="handleAvatarUploaded"
        />
      </el-form-item>

      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" placeholder="请输入姓名" maxlength="20" show-word-limit />
      </el-form-item>

      <el-form-item label="手机" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
      </el-form-item>

      <el-form-item label="第二手机">
        <div class="second-phone-row">
          <el-input
            v-model="form.secondPhone"
            class="second-phone-input"
            placeholder=""
            maxlength="11"
          />
          <div class="second-phone-toggle">
            <span class="second-phone-toggle__label">是否显示</span>
            <el-switch v-model="form.showSecondPhone" />
          </div>
        </div>
      </el-form-item>

      <el-form-item label="微信号">
        <el-input v-model="form.wechat" placeholder="请输入微信号" maxlength="30" />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="50" />
      </el-form-item>

      <el-form-item label="个人简介">
        <div class="textarea-wrapper">
          <el-input
            v-model="form.bio"
            type="textarea"
            :rows="3"
            placeholder="请输入个人简介"
            maxlength="200"
          />
          <span class="char-count">{{ form.bio?.length || 0 }}/200</span>
        </div>
      </el-form-item>

      <el-divider content-position="left">公司职务</el-divider>

      <div class="company-title-panel">
        <div
          v-for="(name, id) in COMPANY_MAP"
          :key="id"
          class="company-inline-row"
        >
          <el-checkbox
            :model-value="enabledCompanyIds.includes(id)"
            class="company-inline-check"
            @change="(checked) => handleCompanyCheckedChange(id, checked)"
          >
            {{ name }}：
          </el-checkbox>
          <el-input
            v-model="companyFields[id].title"
            class="company-inline-input"
            :disabled="!enabledCompanyIds.includes(id)"
            placeholder="请输入职位名称"
            maxlength="20"
          />
        </div>
      </div>

      <template v-if="isEdit">
        <el-divider content-position="left">微信绑定管理</el-divider>

        <div class="wechat-binding-panel">
          <div class="wechat-binding-count">已绑定微信数：{{ boundWechatBindings.length }}</div>

          <div v-if="boundWechatBindings.length" class="wechat-binding-list">
            <div
              v-for="(binding, index) in boundWechatBindings"
              :key="binding.openid"
              class="wechat-binding-item"
            >
              <span class="wechat-binding-item__label">{{ getBoundWechatLabel(index) }}</span>
              <el-input
                v-model="binding.remark"
                class="wechat-binding-item__remark"
                placeholder="请输入备注"
                maxlength="30"
                clearable
              />
              <el-button
                type="danger"
                link
                size="small"
                @click="handleUnbindWechat(binding.openid)"
              >
                解绑
              </el-button>
            </div>
          </div>
          <div v-else class="form-tip">当前员工还没有绑定微信。</div>
        </div>

        <el-divider content-position="left">权限设置</el-divider>

        <el-form-item label="管理员权限">
          <div class="checkbox-panel">
            <el-checkbox v-model="form.isAdmin">是否管理员</el-checkbox>
            <div class="form-tip">勾选后，该员工可以登录后台并拥有管理员权限。</div>
          </div>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { COMPANY_MAP } from '@/config/env'
import { adminCreateStaff, adminUnbindWechat, adminUpdateStaff } from '@/cloud/api'
import ImageUpload from './ImageUpload.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  staffData: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'saved', 'refresh'])

const formRef = ref(null)
const saving = ref(false)
const boundWechatBindings = ref([])

const isEdit = computed(() => !!props.staffData)

const form = reactive({
  avatar: '',
  avatarSource: '',
  name: '',
  phone: '',
  secondPhone: '',
  showSecondPhone: false,
  wechat: '',
  email: '',
  bio: '',
  isAdmin: false,
})

const enabledCompanyIds = ref([])

const companyFields = reactive(
  Object.keys(COMPANY_MAP).reduce((acc, id) => {
    acc[id] = { title: '' }
    return acc
  }, {})
)

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

function resetForm() {
  form.avatar = ''
  form.avatarSource = ''
  form.name = ''
  form.phone = ''
  form.secondPhone = ''
  form.showSecondPhone = false
  form.wechat = ''
  form.email = ''
  form.bio = ''
  form.isAdmin = false
  enabledCompanyIds.value = []
  boundWechatBindings.value = []

  Object.keys(COMPANY_MAP).forEach((id) => {
    companyFields[id].title = ''
  })
}

function onOpen() {
  formRef.value?.clearValidate()

  if (!props.staffData) {
    resetForm()
    return
  }

  const staff = props.staffData
  form.avatar = staff.avatar || staff.avatarRaw || staff.avatarPreview || staff.avatarSource || staff.avatarOriginal || ''
  form.avatarSource = staff.avatarSource || staff.avatarOriginal || staff.avatarRaw || staff.avatar || ''
  form.name = staff.name || ''
  form.phone = staff.phone || ''
  form.secondPhone = staff.secondPhone || ''
  form.showSecondPhone = !!staff.showSecondPhone
  form.wechat = staff.wechat || ''
  form.email = staff.email || ''
  form.bio = staff.bio || ''
  form.isAdmin = !!staff.isAdmin
  boundWechatBindings.value = normalizeBoundWechatBindings(staff)

  const companies = staff.enabledCompanies || []
  enabledCompanyIds.value = companies.map((item) => item.companyId)
  Object.keys(COMPANY_MAP).forEach((id) => {
    const found = companies.find((item) => item.companyId === id)
    companyFields[id].title = found?.title || ''
  })
}

function handleAvatarUploaded({ fileID }) {
  form.avatarSource = fileID || ''
}

function handleCompanyCheckedChange(companyId, checked) {
  if (checked) {
    if (!enabledCompanyIds.value.includes(companyId)) {
      enabledCompanyIds.value.push(companyId)
    }
    return
  }

  enabledCompanyIds.value = enabledCompanyIds.value.filter((id) => id !== companyId)
  companyFields[companyId].title = ''
}

function normalizeBoundWechatBindings(staff = {}) {
  const bindings = Array.isArray(staff.boundWechatBindings) ? staff.boundWechatBindings : []
  const bindingMap = new Map()

  bindings.forEach((item) => {
    const openid = String(item?.openid || '').trim()
    if (openid) {
      bindingMap.set(openid, String(item?.remark || '').trim())
    }
  })

  const openids = Array.isArray(staff.boundWechatOpenids) ? staff.boundWechatOpenids : []
  return openids
    .map((openid) => String(openid || '').trim())
    .filter(Boolean)
    .map((openid) => ({
      openid,
      remark: bindingMap.get(openid) || '',
    }))
}

function getBoundWechatLabel(index) {
  return `微信${index + 1}`
}

async function handleUnbindWechat(targetOpenid) {
  if (!props.staffData?.staffId || !targetOpenid) {
    return
  }

  try {
    await ElMessageBox.confirm(
      '确认解绑这个微信吗？解绑后，这个微信再次打开小程序时将回到绑定页。',
      '解绑微信',
      {
        confirmButtonText: '确认解绑',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const result = await adminUnbindWechat(props.staffData.staffId, targetOpenid)
    boundWechatBindings.value = Array.isArray(result?.boundWechatBindings)
      ? result.boundWechatBindings
      : boundWechatBindings.value.filter((item) => item.openid !== targetOpenid)
    emit('refresh')
    ElMessage.success('解绑成功')
  } catch {
    // 取消或接口错误
  }
}

async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (form.secondPhone && !/^1[3-9]\d{9}$/.test(form.secondPhone)) {
    ElMessage.warning('请输入正确的第二个手机号')
    return
  }

  if (enabledCompanyIds.value.length === 0) {
    ElMessage.warning('请至少开通一家公司')
    return
  }

  const emptyTitle = enabledCompanyIds.value.find((id) => !(companyFields[id].title || '').trim())
  if (emptyTitle) {
    ElMessage.warning(`请填写${COMPANY_MAP[emptyTitle]}的职位`)
    return
  }

  const enabledCompanies = enabledCompanyIds.value.map((id) => ({
    companyId: id,
    title: companyFields[id].title.trim(),
  }))

  const avatarValue = form.avatarSource || form.avatar || ''
  const payload = {
    avatar: avatarValue,
    avatarOriginal: avatarValue,
    name: form.name,
    phone: form.phone,
    secondPhone: form.secondPhone,
    showSecondPhone: !!form.secondPhone && !!form.showSecondPhone,
    wechat: form.wechat,
    email: form.email,
    bio: form.bio,
    enabledCompanies,
  }

  if (isEdit.value) {
    payload.isAdmin = form.isAdmin
    payload.wechatBindings = boundWechatBindings.value.map((item) => ({
      openid: item.openid,
      remark: String(item.remark || '').trim(),
    }))
  }

  saving.value = true
  try {
    let result
    if (isEdit.value) {
      result = await adminUpdateStaff(props.staffData.staffId, payload, props.staffData.pageLoadedAt)
    } else {
      result = await adminCreateStaff(payload)
    }

    ElMessage.success(isEdit.value ? '保存成功' : '创建成功')
    emit('saved', {
      mode: isEdit.value ? 'edit' : 'create',
      credentials: !isEdit.value ? result : null,
    })
  } catch {
    // api.js already handles unified error prompts
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.staff-form {
  padding: 0 8px;

  .textarea-wrapper {
    position: relative;
    width: 100%;

    .char-count {
      position: absolute;
      right: 10px;
      bottom: 6px;
      font-size: 12px;
      color: $text-disabled;
    }
  }

  .company-title-panel {
    margin-top: 4px;
    padding: 8px 16px;
    background: $page-bg;
    border: 1px solid rgba(219, 222, 227, 0.9);
    border-radius: $radius-card;
  }

  .second-phone-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .second-phone-input {
    flex: 1;
    min-width: 0;
  }

  .second-phone-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .second-phone-toggle__label {
    font-size: 14px;
    color: $text-secondary;
  }

  .company-inline-row {
    display: flex;
    align-items: center;
    min-height: 56px;
    gap: 14px;
    border-bottom: 1px solid rgba(219, 222, 227, 0.9);

    &:last-child {
      border-bottom: none;
    }
  }

  .company-inline-check {
    flex-shrink: 0;
    width: 112px;
    margin-right: 0;

    :deep(.el-checkbox__label) {
      font-size: 15px;
      font-weight: 500;
      line-height: 1.5;
      color: $text-secondary;
    }
  }

  .company-inline-input {
    flex: 1;
    min-width: 0;
  }

  .checkbox-panel {
    width: 100%;
    padding: 14px 16px;
    background: $page-bg;
    border: 1px solid rgba(219, 222, 227, 0.9);
    border-radius: $radius-card;
  }

  .form-tip {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.6;
    color: $text-secondary;
  }

  .wechat-binding-panel {
    padding: 14px 16px;
    background: $page-bg;
    border: 1px solid rgba(219, 222, 227, 0.9);
    border-radius: $radius-card;
  }

  .wechat-binding-count {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.6;
    color: $text-secondary;
  }

  .wechat-binding-list {
    margin-top: 10px;
  }

  .wechat-binding-item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    border-bottom: 1px solid rgba(219, 222, 227, 0.9);

    &:last-child {
      border-bottom: none;
    }
  }

  .wechat-binding-item__label {
    flex-shrink: 0;
    width: 56px;
    font-size: 14px;
    color: $text-secondary;
  }

  .wechat-binding-item__remark {
    flex: 1;
    min-width: 0;
  }
}
</style>
