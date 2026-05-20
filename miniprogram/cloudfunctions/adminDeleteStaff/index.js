const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0302, E0305, E0306 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getStaffById, getAdminConfig, normalizeStaffOpenids } = require('./_shared/db')

exports.main = async (event) => {
  try {
    const { staffId } = event
    const { customUserId: operatorId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(operatorId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!staffId) {
      return fail(E0101, '缺少 staffId')
    }

    if (staffId === operatorId) {
      return fail(E0306)
    }

    const targetStaff = await getStaffById(staffId)
    if (!targetStaff) {
      return fail(E0302)
    }

    const db = getDb()
    const isAdmin = !!targetStaff.isAdmin

    if (isAdmin) {
      const adminConfig = await getAdminConfig()
      const currentPhones = Array.isArray(adminConfig?.adminPhones) ? adminConfig.adminPhones : []
      const nextPhones = currentPhones.filter((phone) => phone !== targetStaff.phone)

      if (nextPhones.length === 0) {
        return fail(E0305)
      }

      const targetOpenids = normalizeStaffOpenids(targetStaff)
      const currentOpenids = Array.isArray(adminConfig?.adminOpenids) ? adminConfig.adminOpenids : []
      const nextOpenids = currentOpenids.filter((openid) => !targetOpenids.includes(openid))

      if (adminConfig) {
        await db.collection(COL.ADMIN_CONFIG).doc('admin_config').update({
          data: {
            adminPhones: nextPhones,
            adminOpenids: nextOpenids,
            updatedAt: db.serverDate(),
          },
        })
      }
    }

    await db.collection(COL.STAFF).doc(staffId).remove()

    return success(null)
  } catch (error) {
    console.error('[adminDeleteStaff] error:', error?.message || String(error))
    return fail(E0102)
  }
}
