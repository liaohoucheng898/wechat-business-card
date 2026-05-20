/**
 * 登录态管理
 * Token 存取、过期检查
 */
const STORAGE_KEY = {
  TOKEN: 'session_token',
  EXPIRE: 'session_expire_at',
  STAFF_INFO: 'staff_info'
}

/**
 * 保存登录态
 */
function saveSession(token, expireAt, staffInfo) {
  wx.setStorageSync(STORAGE_KEY.TOKEN, token)
  wx.setStorageSync(STORAGE_KEY.EXPIRE, expireAt)
  wx.setStorageSync(STORAGE_KEY.STAFF_INFO, staffInfo)
}

/**
 * 获取 sessionToken
 */
function getSessionToken() {
  const token = wx.getStorageSync(STORAGE_KEY.TOKEN)
  const expireAt = wx.getStorageSync(STORAGE_KEY.EXPIRE)
  if (!token || !expireAt) return null

  // 过期检查（提前 5 分钟）
  if (Date.now() > expireAt - 5 * 60 * 1000) {
    clearSession()
    return null
  }
  return token
}

/**
 * 获取员工信息
 */
function getStaffInfo() {
  return wx.getStorageSync(STORAGE_KEY.STAFF_INFO) || null
}

function setStaffInfo(staffInfo) {
  if (!staffInfo) return
  saveSession(
    wx.getStorageSync(STORAGE_KEY.TOKEN),
    wx.getStorageSync(STORAGE_KEY.EXPIRE),
    staffInfo
  )
}

/**
 * 更新员工信息（局部更新）
 */
function updateStaffInfo(fields) {
  const info = getStaffInfo()
  if (info) {
    saveSession(
      wx.getStorageSync(STORAGE_KEY.TOKEN),
      wx.getStorageSync(STORAGE_KEY.EXPIRE),
      { ...info, ...fields }
    )
  }
}

/**
 * 清除登录态
 */
function clearSession() {
  wx.removeStorageSync(STORAGE_KEY.TOKEN)
  wx.removeStorageSync(STORAGE_KEY.EXPIRE)
  wx.removeStorageSync(STORAGE_KEY.STAFF_INFO)
}

/**
 * 是否已登录
 */
function isLoggedIn() {
  return !!getSessionToken()
}

function requiresPasswordChange() {
  return false
}

module.exports = {
  saveSession,
  getSessionToken,
  getStaffInfo,
  setStaffInfo,
  updateStaffInfo,
  clearSession,
  isLoggedIn,
  requiresPasswordChange
}
