const { callCloud } = require('../../utils/cloud')
const { isValidPhone } = require('../../utils/format')
const { showError } = require('../../utils/toast')

Component({
  properties: {
    phone: { type: String, value: '' },
    phoneDisabled: { type: Boolean, value: false },
    scene: { type: String, value: 'bind' }
  },
  data: {
    smsCode: '',
    codeText: '获取验证码',
    canSend: true,
    countdown: 0
  },
  methods: {
    onPhoneInput(e) {
      this.setData({ phone: e.detail.value })
      this.triggerEvent('phonechange', { phone: e.detail.value })
    },

    onCodeInput(e) {
      this.setData({ smsCode: e.detail.value })
      this.triggerEvent('codechanage', { code: e.detail.value })
    },

    onSendCode() {
      if (!this.data.canSend) return
      const phone = this.data.phone
      if (!isValidPhone(phone)) {
        showError('请输入正确的手机号')
        return
      }
      this.setData({ canSend: false })
      callCloud('sendSmsCode', {
        phone,
        scene: this.data.scene
      }, { loadingText: '发送中...' }).then(() => {
        this.startCountdown()
        this.triggerEvent('codesent')
      }).catch(() => {
        this.setData({ canSend: true })
      })
    },

    startCountdown() {
      let count = 60
      this.setData({ countdown: count, codeText: `${count}s` })
      this._timer = setInterval(() => {
        count--
        if (count <= 0) {
          clearInterval(this._timer)
          this.setData({ canSend: true, codeText: '重新获取', countdown: 0 })
        } else {
          this.setData({ codeText: `${count}s`, countdown: count })
        }
      }, 1000)
    },

    /** 外部调用获取当前值 */
    getValues() {
      return {
        phone: this.data.phone,
        smsCode: this.data.smsCode
      }
    },

    /** 外部调用重置 */
    reset() {
      if (this._timer) clearInterval(this._timer)
      this.setData({ smsCode: '', codeText: '获取验证码', canSend: true, countdown: 0 })
    }
  },
  detached() {
    if (this._timer) clearInterval(this._timer)
  }
})
