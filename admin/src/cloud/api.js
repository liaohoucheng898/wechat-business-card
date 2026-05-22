/**
 * 云函数调用封装
 * - 自动注入管理员 token
 * - 统一错误处理
 * - loading 状态管理
 */
import cloudApp, { signInWithTicket } from './init'
import { ElMessage, ElLoading } from 'element-plus'
import { CLOUD_HTTP_BASE_URL } from '@/config/env'

let loadingCount = 0
let loadingInstance = null

function showLoading() {
  if (loadingCount === 0) {
    loadingInstance = ElLoading.service({
      lock: true,
      text: '加载中...',
      background: 'rgba(255, 255, 255, 0.7)'
    })
  }
  loadingCount++
}

function hideLoading() {
  loadingCount--
  if (loadingCount <= 0) {
    loadingCount = 0
    if (loadingInstance) {
      loadingInstance.close()
      loadingInstance = null
    }
  }
}

function buildHttpUrl(path) {
  const normalizedBaseUrl = String(CLOUD_HTTP_BASE_URL || '').replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}

async function postPublicHttp(path, data = {}, options = {}) {
  const { loading = true, showError = true } = options

  if (loading) showLoading()

  try {
    const response = await fetch(buildHttpUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data || {})
    })

    let result = null
    try {
      result = await response.json()
    } catch {
      throw new Error('服务返回内容无法识别')
    }

    if (result.code !== 0) {
      if (showError) {
        ElMessage.error(result.msg || '操作失败')
      }
      return Promise.reject(result)
    }

    return result.data
  } catch (err) {
    const message = err?.message || String(err)
    console.error('[postPublicHttp] request failed:', path, message)
    if (showError) {
      ElMessage.error(err?.msg || err?.message || '网络异常，请稍后重试')
    }
    return Promise.reject(err)
  } finally {
    if (loading) hideLoading()
  }
}

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 参数
 * @param {object} options - 配置项
 * @param {boolean} options.loading - 是否显示全局 loading，默认 true
 * @param {boolean} options.injectToken - 是否注入 token，默认 true
 * @param {boolean} options.showError - 是否显示错误提示，默认 true
 * @returns {Promise<any>}
 */
export async function callFunction(name, data = {}, options = {}) {
  const { loading = true, showError = true } = options

  if (loading) showLoading()

  try {
    const res = await cloudApp.callFunction({
      name,
      data
    })

    const result = res.result

    // 统一响应格式检查
    if (result.code !== 0) {
      // session 过期或无权限，跳登录
      if (result.code === 'E0207' || result.code === 'E0208') {
        window.location.href = '/#/login'
        return Promise.reject(result)
      }

      if (showError) {
        ElMessage.error(result.msg || '操作失败')
      }
      return Promise.reject(result)
    }

    return result.data
  } catch (err) {
    const message = err?.message || String(err)
    console.error('[callFunction] request failed:', name, message)
    if (showError) {
      ElMessage.error(err?.msg || err?.message || '网络异常，请稍后重试')
    }
    return Promise.reject(err)
  } finally {
    if (loading) hideLoading()
  }
}

/**
 * 发送短信验证码（公开接口，需要匿名登录态）
 */
export async function sendSmsCode(phone, scene = 'login', options = {}) {
  return postPublicHttp('/auth/admin/send-sms', { phone, scene }, options)
}

/**
 * 管理员登录
 * 1. 先做匿名登录（adminLogin 是公开云函数，用匿名态调用）
 * 2. 调用 adminLogin 云函数校验身份，拿到 ticket
 * 3. 用 ticket 完成 CloudBase Custom Login，建立正式 SDK 登录态
 */
export async function adminLogin(phone, smsCode, options = {}) {
  const data = await postPublicHttp('/auth/admin/login', { phone, smsCode }, options)
  // data 包含 { staffInfo, ticket }
  await signInWithTicket(data.ticket)
  return data
}

/**
 * 管理员账号密码登录
 */
export async function adminPasswordLogin(phone, password, options = {}) {
  const data = await postPublicHttp('/auth/admin/login', { phone, password, loginMode: 'password' }, options)
  await signInWithTicket(data.ticket)
  return data
}

/**
 * 获取员工列表
 */
export function adminGetStaffList(params = {}, options = {}) {
  return callFunction('adminGetStaffList', params, options)
}

/**
 * 新增员工
 */
export function adminCreateStaff(data, options = {}) {
  return callFunction('adminCreateStaff', data, options)
}

/**
 * 批量导入员工
 */
export function adminImportStaff(rows = [], options = {}) {
  return callFunction('adminImportStaff', { rows }, options)
}

/**
 * 编辑员工
 */
export function adminUpdateStaff(staffId, fields, pageLoadedAt, options = {}) {
  return callFunction('adminUpdateStaff', { staffId, fields, pageLoadedAt }, options)
}

/**
 * 停用/启用员工
 */
export function adminToggleStaff(staffId, action) {
  return callFunction('adminToggleStaff', { staffId, action })
}

/**
 * 删除员工
 */
export function adminDeleteStaff(staffId) {
  return callFunction('adminDeleteStaff', { staffId })
}

/**
 * 解绑员工的某一个微信
 */
export function adminUnbindWechat(staffId, targetOpenid) {
  return callFunction('adminUnbindWechat', { staffId, targetOpenid })
}

/**
 * 重置员工密码
 */
export function adminResetPassword(staffId) {
  return callFunction('adminResetPassword', { staffId })
}

/**
 * 获取公司列表
 */
export function adminGetCompanyList(options = {}) {
  return callFunction('adminGetCompanyList', {}, options)
}

/**
 * 获取单个公司详情
 */
export function adminGetCompany(companyId, options = {}) {
  return callFunction('adminGetCompany', { companyId }, options)
}

/**
 * 更新公司信息
 */
export function adminUpdateCompany(companyId, fields, pageLoadedAt, options = {}) {
  return callFunction('adminUpdateCompany', { companyId, fields, pageLoadedAt }, options)
}

/**
 * 获取案例列表
 */
export function adminGetCaseList(params = {}, options = {}) {
  return callFunction('adminGetCaseList', params, options)
}

/**
 * 获取单个案例详情
 */
export function adminGetCase(caseId, options = {}) {
  return callFunction('adminGetCase', { caseId }, options)
}

/**
 * 新增案例
 */
export function adminCreateCase(data) {
  return callFunction('adminCreateCase', data)
}

/**
 * 更新案例
 */
export function adminUpdateCase(caseId, fields, pageLoadedAt) {
  return callFunction('adminUpdateCase', { caseId, fields, pageLoadedAt })
}

/**
 * 删除案例
 */
export function adminDeleteCase(caseId) {
  return callFunction('adminDeleteCase', { caseId })
}

/**
 * 切换案例可见状态
 */
export function adminToggleCaseVisible(caseId, visible) {
  return callFunction('adminToggleCaseVisible', { caseId, visible })
}

/**
 * 栏目管理（新增/编辑/删除/列表）
 */
export function adminManageCategory(action, data = {}, options = {}) {
  return callFunction('adminManageCategory', { action, ...data }, options)
}

/**
 * 获取栏目列表
 */
export function adminGetCategoryList(companyId, options = {}) {
  return callFunction('adminManageCategory', {
    action: 'list',
    companyId
  }, options).then((data) => {
    const categories = data.categories || data.list || []
    return {
      ...data,
      list: categories.map((cat) => ({
        categoryId: cat.categoryId || cat._id,
        name: cat.name,
        sort: cat.sort,
        caseCount: cat.caseCount || 0
      }))
    }
  })
}

/**
 * 获取统计数据
 */
export function adminGetStats(params = {}, options = {}) {
  return callFunction('adminGetStats', params, options)
}

/**
 * 修改当前登录账号密码
 */
export function changePassword(oldPassword, newPassword, options = {}) {
  return callFunction('changePassword', { oldPassword, newPassword }, options)
}
