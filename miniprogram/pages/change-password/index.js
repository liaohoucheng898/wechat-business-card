const { callCloudWithToken } = require('../../utils/cloud')
const { isValidPassword } = require('../../utils/format')
const { showError, showSuccess } = require('../../utils/toast')
const auth = require('../../utils/auth')

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    submitting: false,
    forceMode: false
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/bind-phone/index' })
      return
    }

    this.setData({
      forceMode: auth.requiresPasswordChange()
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value || '' })
  },

  onSubmit() {
    if (this.data.submitting) return

    const { oldPassword, newPassword, confirmPassword } = this.data
    if (!oldPassword) {
      showError('请输入旧密码或临时密码')
      return
    }
    if (!isValidPassword(newPassword)) {
      showError('新密码需为8-20位，且必须同时包含字母和数字')
      return
    }
    if (newPassword !== confirmPassword) {
      showError('两次输入的新密码不一致')
      return
    }
    if (oldPassword === newPassword) {
      showError('新密码不能与旧密码相同')
      return
    }

    this.setData({ submitting: true })
    callCloudWithToken('changePassword', {
      oldPassword,
      newPassword
    }, { loadingText: '保存中...' }).then(() => {
      auth.updateStaffInfo({
        mustChangePassword: false,
        passwordStatus: 'active'
      })

      const app = getApp()
      if (app.globalData.staffInfo) {
        app.globalData.staffInfo = {
          ...app.globalData.staffInfo,
          mustChangePassword: false,
          passwordStatus: 'active'
        }
      }

      showSuccess('密码已更新')
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/my-card/index' })
      }, 800)
    }).catch(() => {
      // cloud.js 已统一处理错误
    }).finally(() => {
      this.setData({ submitting: false })
    })
  }
})
