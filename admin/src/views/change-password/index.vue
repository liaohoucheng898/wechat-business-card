<template>
  <div class="change-password-page">
    <div class="change-password-card">
      <div class="card-header">
        <h2 class="card-title">首次登录，请修改密码</h2>
        <p class="card-desc">
          临时密码只用于首次进入后台
        </p>
        <p class="password-note">
          修改成功后会进入运营驾驶舱。新密码需为 8-20 位，且同时包含字母和数字。
        </p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="change-password-form"
      >
        <el-form-item label="当前临时密码" prop="oldPassword">
          <el-input
            v-model="form.oldPassword"
            type="password"
            show-password
            size="large"
            placeholder="请输入当前密码或临时密码"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            show-password
            size="large"
            placeholder="8-20位，且必须同时包含字母和数字"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            size="large"
            placeholder="请再次输入新密码"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item>
          <div class="action-row">
            <el-button size="large" @click="handleLogout">退出登录</el-button>
            <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
              保存并进入后台
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { changePassword } from '@/cloud/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const submitting = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/

const rules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!passwordRegex.test(value || '')) {
          callback(new Error('新密码需为8-20位，且必须同时包含字母和数字'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.newPassword) {
          callback(new Error('两次输入的新密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    await changePassword(form.oldPassword, form.newPassword, { loading: false })
    userStore.updateAdminInfo({
      mustChangePassword: false,
      passwordStatus: 'active'
    })
    ElMessage.success('密码已更新')
    router.replace('/')
  } catch {
    // api.js 已统一处理错误
  } finally {
    submitting.value = false
  }
}

async function handleLogout() {
  await userStore.logout()
  router.replace('/login')
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.change-password-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $page-bg;
  padding: 24px;
}

.change-password-card {
  width: 440px;
  max-width: 100%;
  background: $card-bg;
  border: 1px solid $border-color;
  border-radius: 12px;
  box-shadow: none;
  padding: 28px;
  box-sizing: border-box;
}

.card-header {
  margin-bottom: 20px;
}

.card-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
  color: $text-primary;
}

.card-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: $text-secondary;
}

.password-note {
  margin: 16px 0 0;
  padding: 12px;
  border: 1px solid $color-primary-border;
  border-radius: $radius-button;
  background: $color-primary-soft;
  color: $text-secondary;
  font-size: 13px;
  line-height: 1.7;
}

.change-password-form {
  :deep(.el-form-item__label) {
    color: $text-secondary;
    font-weight: 500;
  }
}

.action-row {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 480px) {
  .change-password-page {
    padding: 16px;
  }

  .change-password-card {
    padding: 24px 20px;
  }

  .card-title {
    font-size: 22px;
  }

  .action-row {
    flex-direction: column-reverse;

    .el-button {
      width: 100%;
      margin-left: 0;
    }
  }
}
</style>
