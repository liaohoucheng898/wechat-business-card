/**
 * adminToggleCaseVisible — 切换案例可见状态
 * 触发：PC端案例列表点击"显示/隐藏"
 * 鉴权：管理员Token
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// PC端鉴权：通过 @cloudbase/node-sdk 取 Custom Login 的 customUserId（即 staffId）
const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()


const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0501, E0502 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')

exports.main = async (event) => {
  try {
    const { caseId, visible } = event

    // 管理员权限校验
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!caseId) {
      return fail(E0101, '缺少 caseId')
    }
    if (typeof visible !== 'boolean') {
      return fail(E0101, 'visible 必须为 boolean')
    }

    const db = getDb()

    // 查案例是否存在
    let caseDoc
    try {
      const { data } = await db.collection(COL.CASES).doc(caseId).get()
      caseDoc = data
    } catch (e) {
      if (e.errCode === -1) return fail(E0501)
      throw e
    }

    if (!caseDoc) return fail(E0501)
    if (caseDoc.deleted) return fail(E0502)

    await db.collection(COL.CASES).doc(caseId).update({
      data: {
        visible,
        updatedAt: db.serverDate(),
      }
    })

    return success(null)
  } catch (err) {
    console.error('[adminToggleCaseVisible] error:', err?.message || String(err))
    return fail(E0102)
  }
}
