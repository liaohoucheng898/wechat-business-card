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

          <p class="login-note">
            连续输错 5 次后将临时锁定 15 分钟。账号异常请联系主管理员。
          </p>

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
        <div class="visual-top">
          <span>Admin Console</span>
          <span>资料准确 · 展示统一 · 数据可追溯</span>
        </div>

        <div class="visual-main">
          <div class="visual-copy">
            <h2>把公司资料、员工名片和客户案例统一管起来</h2>
            <p>后台负责保证对外信息准确、案例展示清晰、员工开通状态可查，让客户看到的每一张名片都可信。</p>
          </div>

          <div class="visual-metrics">
            <article class="visual-metric">
              <strong>客户访问</strong>
              <span>持续追踪外部访问趋势</span>
            </article>
            <article class="visual-metric">
              <strong>员工名片</strong>
              <span>统一维护人员展示信息</span>
            </article>
            <article class="visual-metric">
              <strong>案例内容</strong>
              <span>按栏目管理客户案例</span>
            </article>
          </div>

          <div class="visual-grid">
            <article class="visual-panel visual-panel--wide">
              <div class="visual-panel__header">
                <strong>浏览趋势</strong>
                <span>默认近 15 天</span>
              </div>
              <div class="trend-preview" aria-hidden="true">
                <span style="height: 76%;" />
                <span style="height: 38%;" />
                <span style="height: 46%;" />
                <span style="height: 62%;" />
                <span style="height: 52%;" />
                <span style="height: 58%;" />
                <span style="height: 70%;" />
                <span style="height: 48%;" />
                <span style="height: 64%;" />
              </div>
            </article>

            <article class="visual-panel">
              <strong>内容状态</strong>
              <div class="status-list">
                <span>公司资料 <em>已维护</em></span>
                <span>官网地址 <em>已填写</em></span>
                <span>案例栏目 <em>可复核</em></span>
              </div>
            </article>

            <article class="visual-panel">
              <strong>待处理</strong>
              <p>优先处理未绑定员工、未归类案例和资料缺失项，保持客户看到的信息准确。</p>
            </article>
          </div>
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

.login-note {
  margin: 0 0 22px;
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
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 46px 54px;
  color: #fff;
}

.visual-top {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.visual-main {
  margin-top: 72px;
}

.visual-copy {
  max-width: 640px;

  h2 {
    margin: 0;
    color: #fff;
    font-size: 44px;
    font-weight: 700;
    line-height: 1.16;
    letter-spacing: 0;
  }

  p {
    max-width: 600px;
    margin: 18px 0 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 16px;
    line-height: 1.8;
  }
}

.visual-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 660px;
  margin-top: 28px;
}

.visual-metric,
.visual-panel {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: $radius-card;
  background: rgba(15, 23, 42, 0.7);
}

.visual-metric {
  padding: 14px;

  strong {
    display: block;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
  }

  span {
    display: block;
    margin-top: 5px;
    color: rgba(255, 255, 255, 0.64);
    font-size: 12px;
    line-height: 1.5;
  }
}

.visual-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 14px;
  margin-top: 38px;
}

.visual-panel {
  padding: 16px;

  strong {
    display: block;
    margin-bottom: 12px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 12px;
    line-height: 1.7;
  }
}

.visual-panel--wide {
  grid-column: span 2;
}

.visual-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  span {
    color: #bfdbfe;
    font-size: 12px;
    font-weight: 600;
  }
}

.trend-preview {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 126px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);

  span {
    flex: 1;
    min-width: 10px;
    border-radius: 6px 6px 0 0;
    background: $color-primary;
  }
}

.status-list {
  display: grid;
  gap: 10px;

  span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 38px;
    padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: $radius-button;
    color: rgba(255, 255, 255, 0.74);
    font-size: 12px;
    background: rgba(255, 255, 255, 0.05);
  }

  em {
    color: #bfdbfe;
    font-style: normal;
    font-weight: 600;
  }
}

@media (max-width: 1080px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-visual {
    padding: 34px;
  }

  .visual-main {
    margin-top: 42px;
  }

  .visual-grid {
    grid-template-columns: 1fr;
  }

  .visual-panel--wide {
    grid-column: span 1;
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
