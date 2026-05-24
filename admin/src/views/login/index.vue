<template>
  <div class="login-page">
    <div class="login-shell">
      <aside class="login-panel">
        <div class="login-card">
          <div class="brand-block">
            <span class="brand-mark">名</span>
            <span class="brand-name">电子名片</span>
          </div>

          <div class="form-header">
            <span class="login-badge">企业名片管理后台</span>
            <h1 class="form-title">管理员登录</h1>
            <p class="form-desc">进入后台，维护企业对外展示的全部内容。</p>
          </div>

          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-position="top"
            class="login-form"
          >
            <el-form-item label="手机号" prop="phone">
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
                登录后台
              </el-button>
            </el-form-item>
          </el-form>

          <div class="login-foot">
            <span>安全登录</span>
            <span>管理员权限</span>
          </div>
        </div>
      </aside>

      <section class="login-visual">
        <div class="hero-art" aria-hidden="true">
          <svg viewBox="0 0 560 390" role="img">
            <defs>
              <linearGradient id="loginFirstBlue" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#dbeafe" />
                <stop offset="1" stop-color="#60a5fa" />
              </linearGradient>
              <linearGradient id="loginFirstTeal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#99f6e4" />
                <stop offset="1" stop-color="#38bdf8" />
              </linearGradient>
              <filter id="loginFirstShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#020617" flood-opacity=".42" />
              </filter>
            </defs>
            <ellipse cx="284" cy="298" rx="218" ry="38" fill="rgba(15, 23, 42, .36)" />
            <path
              d="M70 246 C140 184, 200 170, 276 196 C358 224, 412 192, 490 128"
              fill="none"
              stroke="rgba(147, 197, 253, .34)"
              stroke-width="2"
            />
            <g filter="url(#loginFirstShadow)">
              <rect x="188" y="62" width="184" height="300" rx="32" fill="rgba(15, 23, 42, .72)" stroke="rgba(219, 234, 254, .22)" />
              <rect x="202" y="84" width="156" height="256" rx="24" fill="rgba(248, 250, 252, .92)" />
              <circle cx="280" cy="128" r="28" fill="url(#loginFirstBlue)" />
              <rect x="236" y="171" width="88" height="10" rx="5" fill="#0f172a" />
              <rect x="248" y="192" width="64" height="7" rx="3.5" fill="#64748b" />
              <rect x="224" y="228" width="112" height="36" rx="10" fill="#eff6ff" />
              <rect x="238" y="242" width="84" height="8" rx="4" fill="#2563eb" />
              <rect x="224" y="278" width="48" height="36" rx="10" fill="#f1f5f9" />
              <rect x="288" y="278" width="48" height="36" rx="10" fill="#f1f5f9" />
            </g>
            <g opacity=".94">
              <circle cx="96" cy="156" r="32" fill="rgba(255, 255, 255, .1)" stroke="rgba(219, 234, 254, .22)" />
              <circle cx="96" cy="146" r="11" fill="url(#loginFirstTeal)" />
              <path d="M74 174 Q96 154 118 174" fill="rgba(219, 234, 254, .7)" />
            </g>
            <g opacity=".94">
              <circle cx="456" cy="126" r="38" fill="rgba(255, 255, 255, .1)" stroke="rgba(219, 234, 254, .22)" />
              <path d="M438 136 L438 116 L456 106 L474 116 L474 136 Z" fill="url(#loginFirstBlue)" />
              <path d="M446 136 V124 H466 V136" fill="#0f172a" opacity=".42" />
            </g>
            <circle cx="380" cy="210" r="7" fill="#93c5fd" />
            <circle cx="168" cy="218" r="5" fill="#5eead4" />
          </svg>
        </div>

        <div class="visual-copy">
          <h2>让客户第一眼，<br />就看见专业和可信。</h2>
          <p>员工分享出去的每一张名片，都是公司交给客户的第一印象。</p>
        </div>
      </section>
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
    const data = await adminPasswordLogin(passwordForm.phone, passwordForm.password, { loading: false })
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
  display: grid;
  place-items: center;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(115deg, rgba($color-primary, 0.2), transparent 42%),
    linear-gradient(245deg, rgba(#0f766e, 0.22), transparent 52%),
    #111827;
  background-size: 48px 48px, 48px 48px, auto, auto, auto;
  padding: 24px;
}

.login-shell {
  display: grid;
  grid-template-columns: 500px minmax(0, 1fr);
  width: min(1180px, 100%);
  min-height: 720px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-card;
  background: #111827;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.login-card {
  width: 390px;
  max-width: 100%;
  box-sizing: border-box;
}

.brand-block {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 54px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: $radius-card;
  color: #fff;
  background: $color-primary;
  font-weight: 800;
}

.brand-name {
  color: $text-primary;
  font-size: 18px;
  font-weight: 700;
}

.form-header {
  margin-bottom: 22px;
}

.login-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  margin-bottom: 18px;
  padding: 0 10px;
  border: 1px solid $color-primary-border;
  border-radius: $radius-tag;
  color: $color-primary-hover;
  font-size: 12px;
  font-weight: 600;
  background: $color-primary-soft;
}

.form-title {
  margin: 0 0 8px;
  color: $text-primary;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0;
}

.form-desc {
  margin: 0;
  color: $text-secondary;
  font-size: 14px;
  line-height: 1.7;
}

.login-form {
  :deep(.el-form-item__label) {
    color: $text-secondary;
    font-weight: 500;
  }

  :deep(.el-input__wrapper) {
    min-height: 44px;
    border-radius: $radius-input;
  }
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  min-height: 44px;
  border-radius: $radius-button;
  font-weight: 600;
}

.login-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  color: $text-auxiliary;
  font-size: 12px;
}

.login-visual {
  position: relative;
  display: grid;
  align-content: center;
  justify-items: center;
  min-width: 0;
  padding: 54px;
  color: #fff;
  overflow: hidden;
  isolation: isolate;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -3;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(0deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
      #0f172a;
    background-size: 52px 52px;
  }

  &::after {
    content: "";
    position: absolute;
    z-index: -2;
    width: 620px;
    height: 620px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 42% 48%, rgba(96, 165, 250, 0.34), transparent 34%),
      radial-gradient(circle at 62% 58%, rgba(45, 212, 191, 0.22), transparent 40%);
    opacity: 0.9;
    filter: blur(26px);
  }
}

.hero-art {
  width: min(560px, 90%);
  height: 390px;
  display: grid;
  place-items: center;

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
}

.visual-copy {
  max-width: 640px;
  text-align: center;

  h2 {
    margin: 0;
    color: rgba(255, 255, 255, 0.96);
    font-size: 40px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0;
  }

  p {
    margin: 16px auto 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 16px;
    line-height: 1.75;
  }
}

@media (max-width: 1080px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-visual {
    padding: 40px;
  }

  .hero-art {
    width: min(520px, 84%);
    height: 360px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 0;
    background: #f8fafc;
  }

  .login-shell {
    min-height: 100vh;
    border: 0;
    border-radius: 0;
  }

  .login-panel {
    padding: 24px 20px;
  }

  .login-visual {
    display: none;
  }

  .brand-block {
    margin-bottom: 36px;
  }

  .form-title {
    font-size: 22px;
  }
}
</style>
