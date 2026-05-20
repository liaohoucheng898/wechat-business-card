const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// PC端鉴权：通过 @cloudbase/node-sdk 取 Custom Login 的 customUserId（即 staffId）
const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()


const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0302, E0304 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getStaffById } = require('./_shared/db')

exports.main = async (event) => {
  try {
    const { staffId, action } = event   // staffId = 被操作的目标员工

    // 管理员权限校验
    const { customUserId: operatorId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(operatorId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!staffId) {
      return fail(E0101, '缺少 staffId')
    }
    if (!['enable', 'disable'].includes(action)) {
      return fail(E0101, 'action 必须为 enable 或 disable')
    }

    // 查目标员工
    const staff = await getStaffById(staffId)
    if (!staff) {
      return fail(E0302)
    }

    // 不能停用自己
    if (action === 'disable' && staffId === operatorId) {
      return fail(E0304)
    }

    const db = getDb()
    const updateData = {
      status: action === 'disable' ? 'disabled' : 'active',
      updatedAt: db.serverDate(),
    }

    // disable时清除登录token（强制登出）
    if (action === 'disable') {
      updateData.sessionToken = null
      updateData.sessionExpireAt = null
      updateData.pcSessionToken = null
      updateData.pcSessionExpireAt = null
    }

    await db.collection(COL.STAFF).doc(staffId).update({ data: updateData })

    return success(null)
  } catch (err) {
    console.error('[adminToggleStaff] error:', err?.message || String(err))
    return fail(E0102)
  }
}
