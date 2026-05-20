/**
 * Toast/Modal 统一封装
 */

function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

function showSuccess(title) {
  wx.showToast({ title, icon: 'success', duration: 1500 })
}

function showError(title) {
  wx.showToast({ title, icon: 'none', duration: 2500 })
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

/**
 * 确认弹窗（Promise化）
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#3764F7',
      success(res) {
        resolve(res.confirm)
      }
    })
  })
}

/**
 * 纯提示弹窗
 */
function showAlert(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      showCancel: false,
      confirmColor: '#3764F7',
      success() {
        resolve()
      }
    })
  })
}

module.exports = {
  showToast,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showConfirm,
  showAlert
}
