<template>
  <div class="change-password-page">
    <div class="change-password-card">
      <div class="card-header">
        <h2 class="card-title">修改密码</h2>
        <p class="card-desc">
          {{ userStore.mustChangePassword ? '当前账号正在使用临时密码，请先设置一个新密码。' : '请修改为你自己的常用密码。' }}
        </p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="change-password-form"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input
            v-model="form.oldPassword"
            type="password"
            show-password
            placeholder="请输入当前密码或临时密码"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            show-password
            placeholder="8-20位，且必须同时包含字母和数字"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item>
          <div class="action-row">
            <el-button @click="handleLogout">退出登录</el-button>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">
              保存新密码
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
    await changePassword(form.oldPassword, form.newPassword)
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
  background: linear-gradient(180deg, rgba(22, 119, 255, 0.08) 0%, #F5F6FA 100%);
  padding: 24px;
}

.change-password-card {
  width: 480px;
  max-width: 100%;
  background: #fff;
  border-radius: 20px;
  padding: 28px 28px 20px;
  box-shadow: 0 18px 48px rgba(22, 119, 255, 0.08);
}

.card-header {
  margin-bottom: 24px;
}

.card-title {
  margin: 0 0 8px;
  font-size: 24px;
  color: $text-primary;
}

.card-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: $text-secondary;
}

.action-row {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
