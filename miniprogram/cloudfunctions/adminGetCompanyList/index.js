/**
 * adminGetCompanyList — 获取公司列表
 * 触发：PC端公司管理页加载
 * 鉴权：管理员Token
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// PC端鉴权：通过 @cloudbase/node-sdk 取 Custom Login 的 customUserId（即 staffId）
const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()


const { success, fail } = require('./_shared/response')
const { E0102 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')

exports.main = async (event) => {
  try {

    // 管理员权限校验
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    const db = getDb()

    const { data: companies } = await db.collection(COL.COMPANIES)
      .orderBy('_id', 'asc')
      .get()

    const result = success({
      list: companies.map(c => ({
        companyId: c._id,
        name: c.name,
        logo: c.logo || '',
        address: c.address || '',
        phone: c.phone || '',
        website: c.website || '',
        updatedAt: c.updatedAt ? c.updatedAt.getTime() : 0,
      }))
    })
    return result
  } catch (err) {
    console.error('[adminGetCompanyList] error:', err?.message || String(err))
    return fail(E0102)
  }
}
