const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0207, E0213, E0215 } = require('./_shared/error-codes')
const { verifyToken, verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')
const { checkRequired, isValidPassword } = require('./_shared/validate')
const { buildPasswordFields, verifyPassword } = require('./_shared/password')

async function resolveCurrentStaff(event) {
  if (event.sessionToken) {
    const tokenResult = await verifyToken(event.sessionToken)
    if (tokenResult.error) {
      return { error: tokenResult.error }
    }
    return { staffInfo: tokenResult.staffInfo }
  }

  const { customUserId: staffId } = tcbAuth.getUserInfo()
  const adminResult = await verifyAdminByStaffId(staffId)
  if (adminResult.error) {
    return { error: adminResult.error }
  }
  return { staffInfo: adminResult.staffInfo }
}

exports.main = async (event) => {
  try {
    const { valid, missing } = checkRequired(event, ['oldPassword', 'newPassword'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    if (!isValidPassword(event.newPassword)) {
      return fail(E0215)
    }

    if (event.oldPassword === event.newPassword) {
      return fail(E0215, '新密码不能与旧密码相同')
    }

    const authResult = await resolveCurrentStaff(event)
    if (authResult.error) {
      return fail(authResult.error)
    }

    const staff = authResult.staffInfo
    if (!staff) {
      return fail(E0207)
    }

    const oldPasswordValid = await verifyPassword(event.oldPassword, staff)
    if (!oldPasswordValid) {
      return fail(E0213, '旧密码错误')
    }

    const db = getDb()
    const passwordFields = await buildPasswordFields(event.newPassword, { temporary: false })
    await db.collection(COL.STAFF).doc(staff._id).update({
      data: {
        ...passwordFields,
        passwordUpdatedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return success({
      staffId: staff._id,
      passwordStatus: 'active',
      mustChangePassword: false,
      updatedAt: Date.now(),
    })
  } catch (error) {
    console.error('[changePassword] error:', error?.message || String(error))
    return fail(E0102)
  }
}
