/**
 * 云函数调用封装
 * 统一loading、错误处理、重试
 */
const { showToast, showError } = require('./toast')

/**
 * 调用云函数
 * @param {string} name 云函数名
 * @param {object} data 入参
 * @param {object} opts 选项
 * @param {boolean} opts.showLoading 是否显示loading，默认true
 * @param {string} opts.loadingText loading文字
 * @param {boolean} opts.silent 静默模式，不弹错误提示
 */
function callCloud(name, data = {}, opts = {}) {
  const { showLoading = true, loadingText = '加载中...', silent = false } = opts

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true })
  }

  return wx.cloud.callFunction({
    name,
    data
  }).then(res => {
    if (showLoading) wx.hideLoading()
    const result = res.result || {}
    if (result.code === 0) {
      return result.data
    }
    // 业务错误
    const err = new Error(result.msg || '请求失败')
    err.code = result.code
    err.data = result.data
    throw err
  }).catch(err => {
    if (showLoading) wx.hideLoading()
    // Token过期，跳转绑定页
    if (err.code === 'E0207') {
      const auth = require('./auth')
      auth.clearSession()
      wx.redirectTo({ url: '/pages/bind-phone/index' })
      return Promise.reject(err)
    }
    if (!silent) {
      showError(err.message || '网络异常，请稍后重试')
    }
    return Promise.reject(err)
  })
}

/**
 * 带token的云函数调用（需要登录态的接口）
 */
function redirectToBind() {
  wx.redirectTo({ url: '/pages/bind-phone/index' })
}

function waitForAutoLogin() {
  try {
    const app = getApp()
    if (!app) {
      return null
    }

    if (app.globalData && app.globalData.authPromise && !app.globalData.authReady) {
      return app.globalData.authPromise
    }

    if (typeof app.autoLogin === 'function') {
      return app.autoLogin()
    }
  } catch (e) {}

  return null
}

function callCloudWithToken(name, data = {}, opts = {}) {
  const auth = require('./auth')
  const token = auth.getSessionToken()
  if (token) {
    return callCloud(name, { ...data, sessionToken: token }, opts)
  }

  const authPromise = waitForAutoLogin()
  if (authPromise && typeof authPromise.then === 'function') {
    return authPromise.then(() => {
      const nextToken = auth.getSessionToken()
      if (!nextToken) {
        redirectToBind()
        return Promise.reject(new Error('未登录'))
      }
      return callCloud(name, { ...data, sessionToken: nextToken }, opts)
    })
  }

  redirectToBind()
  return Promise.reject(new Error('未登录'))
}

module.exports = {
  callCloud,
  callCloudWithToken
}
