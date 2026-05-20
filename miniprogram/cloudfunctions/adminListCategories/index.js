const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// PC端鉴权：通过 @cloudbase/node-sdk 取 Custom Login 的 customUserId（即 staffId）
const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()


const { success, fail } = require('./_shared/response')
const { E0101, E0102 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')

exports.main = async (event) => {
  try {
    const { companyId } = event

    // 管理员权限校验
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!companyId) {
      return fail(E0101, '缺少 companyId')
    }

    const db = getDb()

    const { data: categories } = await db.collection(COL.CASE_CATEGORIES)
      .where({ companyId })
      .orderBy('sort', 'asc')
      .get()

    const list = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      sort: cat.sort,
      createdAt: cat.createdAt ? cat.createdAt.getTime() : null,
    }))

    return success({ categories: list })
  } catch (err) {
    console.error('[adminListCategories] error:', err?.message || String(err))
    return fail(E0102)
  }
}
