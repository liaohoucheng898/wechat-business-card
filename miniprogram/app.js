const config = require('./config/env')

const MIN_SDK_VERSION = '2.25.0'

function compareVersion(versionA = '0.0.0', versionB = '0.0.0') {
  const partsA = String(versionA).split('.').map(item => Number(item) || 0)
  const partsB = String(versionB).split('.').map(item => Number(item) || 0)
  const maxLength = Math.max(partsA.length, partsB.length)

  for (let index = 0; index < maxLength; index += 1) {
    const valueA = partsA[index] || 0
    const valueB = partsB[index] || 0
    if (valueA > valueB) return 1
    if (valueA < valueB) return -1
  }

  return 0
}

App({
  globalData: {
    staffInfo: null,
    sessionToken: null,
    launchOptions: null,
    enterOptions: null,
    authReady: false,
    authPromise: null,
    authResult: null
  },

  onLaunch() {
    // 初始化云开发
    if (!this.isSdkVersionSupported() || !wx.cloud) {
      this.showLowSdkVersionTip()
      return
    }
    wx.cloud.init({
      env: config.cloudEnvId,
      traceUser: true
    })

    this.globalData.launchOptions = wx.getLaunchOptionsSync ? wx.getLaunchOptionsSync() : null
    this.globalData.enterOptions = this.globalData.launchOptions

    // 尝试自动登录
    this.globalData.authPromise = this.autoLogin()
  },

  onShow(options) {
    if (options) {
      this.globalData.enterOptions = options
    }
  },

  isSdkVersionSupported() {
    const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {}
    return compareVersion(systemInfo.SDKVersion || '0.0.0', MIN_SDK_VERSION) >= 0
  },

  showLowSdkVersionTip() {
    const content = `请升级微信版本后再使用本小程序，当前功能需要微信基础库 ${MIN_SDK_VERSION} 或以上版本。`
    console.error(content)

    if (wx.showModal) {
      wx.showModal({
        title: '微信版本过低',
        content,
        showCancel: false
      })
    }
  },

  isDefaultEntryLaunch() {
    const launchOptions = this.globalData.launchOptions || {}
    const path = launchOptions.path || ''
    const query = launchOptions.query || {}
    const isMyCardEntry = !path || path === 'pages/my-card/index'
    const isLegacyCardEntry = (
      path === 'pages/card/index' &&
      !query.staffId &&
      !query.companyId
    )

    return isMyCardEntry || isLegacyCardEntry
  },

  redirectToDefaultEntry(url) {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    const currentRoute = current && current.route
    const targetRoute = url.replace(/^\//, '').replace(/\?.*$/, '')

    if (currentRoute === targetRoute) {
      return
    }

    wx.reLaunch({ url })
  },

  autoLogin() {
    const auth = require('./utils/auth')
    const { callCloud } = require('./utils/cloud')

    if (this.globalData.authPromise && !this.globalData.authReady) {
      return this.globalData.authPromise
    }

    this.globalData.authReady = false

    const finishAuth = (result) => {
      this.globalData.authReady = true
      this.globalData.authResult = result
      return result
    }

    // 先检查本地是否有有效token
    if (auth.isLoggedIn()) {
      const staffInfo = auth.getStaffInfo()
      const sessionToken = auth.getSessionToken()
      this.globalData.staffInfo = staffInfo
      this.globalData.sessionToken = sessionToken
      const result = finishAuth({
        loggedIn: true,
        needBind: false,
        staffInfo,
        sessionToken
      })
      this.globalData.authPromise = Promise.resolve(result)
      if (this.isDefaultEntryLaunch()) {
        this.redirectToDefaultEntry('/pages/my-card/index')
      }
      return this.globalData.authPromise
    }

    // 调用login云函数尝试用openid自动登录
    this.globalData.authPromise = callCloud('login', {}, { showLoading: false, silent: true }).then(data => {
      if (!data) {
        return finishAuth({
          loggedIn: false,
          needBind: false
        })
      }

      // 未绑定手机号：直接跳转绑定页，避免首页一直loading
      if (data.needBind) {
        const result = finishAuth({
          loggedIn: false,
          needBind: true
        })
        if (this.isDefaultEntryLaunch()) {
          this.redirectToDefaultEntry('/pages/bind-phone/index')
        }
        return result
      }

      auth.saveSession(data.sessionToken, data.sessionExpireAt, data.staffInfo)
      this.globalData.staffInfo = data.staffInfo
      this.globalData.sessionToken = data.sessionToken
      const result = finishAuth({
        loggedIn: true,
        needBind: false,
        staffInfo: data.staffInfo,
        sessionToken: data.sessionToken
      })
      if (this.isDefaultEntryLaunch()) {
        this.redirectToDefaultEntry('/pages/my-card/index')
      }
      return result
    }).catch(() => {
      // 静默失败，用户打开需要登录的页面时会跳转绑定页
      return finishAuth({
        loggedIn: false,
        needBind: false
      })
    })

    return this.globalData.authPromise
  },

  waitForAuthReady() {
    if (this.globalData.authPromise) {
      return this.globalData.authPromise
    }
    if (!this.globalData.authReady) {
      return this.autoLogin()
    }
    return Promise.resolve(this.globalData.authResult || {
      loggedIn: false,
      needBind: false
    })
  },

  /**
   * 获取分享信息（全局默认）
   */
  onShareAppMessage() {
    return {
      title: '有幸相识，愿您乘风破浪',
      path: '/pages/card/index'
    }
  }
})
