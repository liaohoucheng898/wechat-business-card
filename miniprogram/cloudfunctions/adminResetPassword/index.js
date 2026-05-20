const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0302 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getStaffById } = require('./_shared/db')
const { checkRequired } = require('./_shared/validate')
const { buildPasswordFields, generateTempPassword } = require('./_shared/password')

exports.main = async (event) => {
  try {
    const { valid, missing } = checkRequired(event, ['staffId'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    const targetStaff = await getStaffById(event.staffId)
    if (!targetStaff) {
      return fail(E0302)
    }

    const db = getDb()
    const temporaryPassword = generateTempPassword(8)
    const passwordFields = await buildPasswordFields(temporaryPassword, { temporary: true })

    await db.collection(COL.STAFF).doc(targetStaff._id).update({
      data: {
        ...passwordFields,
        passwordUpdatedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return success({
      staffId: targetStaff._id,
      phone: targetStaff.phone,
      temporaryPassword,
      passwordStatus: 'temporary',
      mustChangePassword: true,
    })
  } catch (error) {
    console.error('[adminResetPassword] error:', error?.message || String(error))
    return fail(E0102)
  }
}
