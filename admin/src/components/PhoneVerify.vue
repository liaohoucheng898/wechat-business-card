<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
    <el-form-item label="手机号" prop="phone">
      <el-input
        v-model="form.phone"
        placeholder="请输入手机号"
        maxlength="11"
        clearable
        size="large"
      >
        <template #prefix>
          <el-icon><Iphone /></el-icon>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item label="验证码" prop="smsCode">
      <div class="code-row">
        <el-input
          v-model="form.smsCode"
          placeholder="请输入验证码"
          maxlength="6"
          size="large"
          class="code-input"
          @keyup.enter="handleSubmit"
        >
          <template #prefix>
            <el-icon><Message /></el-icon>
          </template>
        </el-input>
        <el-button
          size="large"
          :disabled="countdown > 0 || !isPhoneValid"
          :loading="sendingCode"
          class="code-btn"
          @click="handleSendCode"
        >
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </el-button>
      </div>
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        size="large"
        :loading="loading"
        class="submit-btn"
        @click="handleSubmit"
      >
        {{ submitText }}
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Iphone, Message } from '@element-plus/icons-vue'
import { sendSmsCode } from '@/cloud/api'

const props = defineProps({
  loading: { type: Boolean, default: false },
  submitText: { type: String, default: '确 认' }
})

const emit = defineEmits(['submit'])

const formRef = ref(null)
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer = null

const form = reactive({
  phone: '',
  smsCode: ''
})

const phoneRegex = /^1[3-9]\d{9}$/
const isPhoneValid = computed(() => phoneRegex.test(form.phone))

const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phoneRegex, message: '手机号格式不正确', trigger: 'blur' }
  ],
  smsCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位', trigger: 'blur' }
  ]
}

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (!isPhoneValid.value) return
  sendingCode.value = true
  try {
    await sendSmsCode(form.phone, 'login', { loading: false })
    ElMessage.success('验证码已发送')
    startCountdown()
  } catch {
    // api.js 已处理错误
  } finally {
    sendingCode.value = false
  }
}

function handleSubmit() {
  formRef.value.validate((valid) => {
    if (valid) {
      emit('submit', { phone: form.phone, smsCode: form.smsCode })
    }
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.code-row {
  display: flex;
  gap: 12px;
  width: 100%;

  .code-input {
    flex: 1;
  }

  .code-btn {
    width: 120px;
    flex-shrink: 0;
  }
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
