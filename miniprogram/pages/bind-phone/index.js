const { callCloud } = require('../../utils/cloud')
const { isValidPhone, isValidPassword } = require('../../utils/format')
const { showError, showSuccess } = require('../../utils/toast')
const auth = require('../../utils/auth')

function syncGlobalSession(data) {
  const app = getApp()
  const authResult = {
    loggedIn: true,
    needBind: false,
    staffInfo: data.staffInfo,
    sessionToken: data.sessionToken
  }
  app.globalData.staffInfo = data.staffInfo
  app.globalData.sessionToken = data.sessionToken
  app.globalData.authReady = true
  app.globalData.authResult = authResult
  app.globalData.authPromise = Promise.resolve(authResult)
}

function redirectAfterLogin(data) {
  auth.saveSession(data.sessionToken, data.sessionExpireAt, data.staffInfo)
  syncGlobalSession(data)

  showSuccess('绑定成功')
  setTimeout(() => {
    wx.redirectTo({ url: '/pages/my-card/index' })
  }, 800)
}

Page({
  data: {
    phone: '',
    password: '',
    canSubmit: false,
    submitting: false
  },

  onLoad() {
    this._redirectIfLoggedIn()
  },

  _waitForAuthReady() {
    const app = getApp()
    if (app && typeof app.waitForAuthReady === 'function') {
      return app.waitForAuthReady()
    }
    if (app && typeof app.autoLogin === 'function') {
      return app.autoLogin()
    }
    return Promise.resolve()
  },

  _redirectIfLoggedIn() {
    this._waitForAuthReady().then(() => {
      if (auth.isLoggedIn()) {
        wx.redirectTo({ url: '/pages/my-card/index' })
      }
    }).catch(() => {
      if (auth.isLoggedIn()) {
        wx.redirectTo({ url: '/pages/my-card/index' })
      }
    })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value || '' })
    this._checkCanSubmit()
  },

  onPasswordPhoneInput(e) {
    this.setData({ phone: e.detail.value || '' })
    this._checkCanSubmit()
  },

  _checkCanSubmit() {
    const { phone, password } = this.data
    this.setData({
      canSubmit: isValidPhone(phone) && isValidPassword(password)
    })
  },

  onSubmit() {
    if (this.data.submitting) return
    this.handlePasswordLogin()
  },

  handlePasswordLogin() {
    const { phone, password, canSubmit } = this.data
    if (!canSubmit) {
      showError('请输入正确的账号和密码')
      return
    }

    this.setData({ submitting: true })
    callCloud('passwordLogin', { phone, password }, {
      loadingText: '绑定中...'
    }).then((data) => {
      redirectAfterLogin(data)
    }).catch((err) => {
      if (err.code === 'E0209') {
        showError('该手机号未开通，请联系管理员')
      } else if (err.code === 'E0210') {
        showError('该账号已绑定其他微信，请联系管理员重置密码后重新绑定')
      } else if (err.code === 'E0211') {
        showError('该账号已停用，请联系管理员')
      }
    }).finally(() => {
      this.setData({ submitting: false })
    })
  }
})
