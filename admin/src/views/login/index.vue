<template>
  <div class="login-page">
    <div class="login-card">
      <div class="form-header">
        <h1 class="form-title">电子名片管理后台</h1>
        <p class="form-desc">请使用管理员手机号和密码登录</p>
      </div>

      <p class="login-note">
        PC 后台仅支持管理员进入。连续输错多次后可能临时锁定，请联系主管理员处理。
      </p>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
        class="login-form"
      >
        <el-form-item label="账号" prop="phone">
          <el-input
            v-model="passwordForm.phone"
            placeholder="请输入手机号"
            maxlength="11"
            clearable
            size="large"
            @keyup.enter="handlePasswordLogin"
          >
            <template #prefix>
              <el-icon><Iphone /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            show-password
            placeholder="请输入密码"
            size="large"
            @keyup.enter="handlePasswordLogin"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loginLoading"
            class="submit-btn"
            @click="handlePasswordLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Iphone, Lock } from '@element-plus/icons-vue'
import { adminPasswordLogin } from '@/cloud/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loginLoading = ref(false)
const passwordFormRef = ref(null)

const passwordForm = reactive({
  phone: '',
  password: ''
})

const passwordRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/,
      message: '密码需为 8-20 位，且必须同时包含字母和数字',
      trigger: 'blur'
    }
  ]
}

function normalizeAdminInfo(data) {
  return {
    ...data.staffInfo,
    passwordStatus: data.passwordStatus || data.staffInfo?.passwordStatus || 'active',
    mustChangePassword: Boolean(data.mustChangePassword || data.staffInfo?.mustChangePassword)
  }
}

async function finishLogin(data) {
  userStore.setLoginData(normalizeAdminInfo(data))
  ElMessage.success('登录成功')
  router.replace(userStore.mustChangePassword ? '/change-password' : '/')
}

async function handlePasswordLogin() {
  try {
    await passwordFormRef.value.validate()
  } catch {
    return
  }

  loginLoading.value = true
  try {
    const data = await adminPasswordLogin(passwordForm.phone, passwordForm.password)
    await finishLogin(data)
  } catch {
    // api.js 已统一处理错误
  } finally {
    loginLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $page-bg;
  padding: 24px;
}

.login-card {
  width: 440px;
  max-width: 100%;
  background: $card-bg;
  border: 1px solid $border-color;
  border-radius: 12px;
  box-shadow: none;
  padding: 28px;
  box-sizing: border-box;
}

.form-header {
  margin-bottom: 20px;
}

.form-title {
  margin: 0 0 8px;
  color: $text-primary;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
}

.form-desc {
  margin: 0;
  color: $text-secondary;
  font-size: 14px;
  line-height: 1.7;
}

.login-note {
  margin: 0 0 24px;
  padding: 12px;
  border: 1px solid $color-primary-border;
  border-radius: $radius-button;
  background: $color-primary-soft;
  color: $text-secondary;
  font-size: 13px;
  line-height: 1.7;
}

.login-form {
  :deep(.el-form-item__label) {
    color: $text-secondary;
    font-weight: 500;
  }
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}

@media (max-width: 480px) {
  .login-page {
    padding: 16px;
  }

  .login-card {
    padding: 24px 20px;
  }

  .form-title {
    font-size: 22px;
  }
}
</style>
