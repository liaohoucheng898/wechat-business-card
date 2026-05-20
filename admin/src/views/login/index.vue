<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-intro">
        <div class="intro-content">
          <h1 class="intro-title">电子名片</h1>
          <h2 class="intro-subtitle">管理后台</h2>
          <p class="intro-desc">
            统一管理员工名片、公司信息和案例展示，<br />
            帮助团队高效开展业务。
          </p>
          <div class="intro-features">
            <div class="feature-item">
              <el-icon :size="18"><User /></el-icon>
              <span>员工管理</span>
            </div>
            <div class="feature-item">
              <el-icon :size="18"><OfficeBuilding /></el-icon>
              <span>公司管理</span>
            </div>
            <div class="feature-item">
              <el-icon :size="18"><Suitcase /></el-icon>
              <span>案例管理</span>
            </div>
            <div class="feature-item">
              <el-icon :size="18"><DataAnalysis /></el-icon>
              <span>数据统计</span>
            </div>
          </div>
        </div>
      </div>

      <div class="login-form-area">
        <div class="form-header">
          <h3 class="form-title">管理员登录</h3>
          <p class="form-desc">PC 后台仅支持管理员使用账号密码登录。</p>
        </div>

        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-position="top"
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

    <div class="login-footer">
      © {{ new Date().getFullYear() }} 海南华悦科技有限公司
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, OfficeBuilding, Suitcase, DataAnalysis, Iphone, Lock } from '@element-plus/icons-vue'
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $color-primary 0%, #6B8CFF 50%, $color-purple 100%);
  padding: $spacing-lg;
}

.login-card {
  display: flex;
  width: 860px;
  min-height: 520px;
  background: $card-bg;
  border-radius: $radius-card;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.login-intro {
  flex: 1;
  background: linear-gradient(160deg, rgba($color-primary, 0.08) 0%, rgba($color-purple, 0.05) 100%);
  padding: 40px 36px;
  display: flex;
  align-items: flex-start;

  .intro-title {
    font-size: 28px;
    font-weight: 700;
    color: $color-primary;
    margin: 0 0 4px;
  }

  .intro-subtitle {
    font-size: 20px;
    font-weight: 500;
    color: $text-primary;
    margin: 0 0 16px;
  }

  .intro-desc {
    font-size: 15px;
    color: $text-secondary;
    line-height: 1.8;
    margin: 0 0 32px;
  }

  .intro-features {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    color: $text-secondary;

    .el-icon {
      color: $color-primary;
    }
  }
}

.login-form-area {
  flex: 1;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.form-header {
  margin-bottom: 24px;
}

.form-title {
  font-size: 22px;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 8px;
}

.form-desc {
  font-size: 15px;
  color: $text-secondary;
  margin: 0;
  line-height: 1.8;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}

.login-footer {
  margin-top: 32px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
