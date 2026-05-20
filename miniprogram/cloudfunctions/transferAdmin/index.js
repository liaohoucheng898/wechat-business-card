const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// PC端鉴权：通过 @cloudbase/node-sdk 取 Custom Login 的 customUserId（即 staffId）
const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()


const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0302, E0305 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getStaffByPhone, getAdminConfig, normalizeStaffOpenids } = require('./_shared/db')

exports.main = async (event) => {
  try {
    const { action, targetPhone } = event

    // 管理员权限校验
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!['add', 'remove'].includes(action)) {
      return fail(E0101, 'action 必须为 add 或 remove')
    }
    if (!targetPhone) {
      return fail(E0101, '缺少 targetPhone')
    }

    const db = getDb()
    const _ = db.command

    // 查目标员工
    const targetStaff = await getStaffByPhone(targetPhone)
    if (!targetStaff) {
      return fail(E0302)
    }

    // 获取 admin_config
    const adminConfig = await getAdminConfig()

    if (action === 'add') {
      // 添加管理员
      const updateConfigData = {
        updatedAt: db.serverDate(),
      }

      // phone 加入 adminPhones（去重）
      if (!adminConfig.adminPhones.includes(targetPhone)) {
        updateConfigData.adminPhones = _.push(targetPhone)
      }

      const targetOpenids = normalizeStaffOpenids(targetStaff)

      // 如果该员工已有已绑定微信 → 加入 adminOpenids（去重）
      const newAdminOpenids = Array.isArray(adminConfig.adminOpenids) ? [...adminConfig.adminOpenids] : []
      let hasOpenidChanges = false
      targetOpenids.forEach((openid) => {
        if (!newAdminOpenids.includes(openid)) {
          newAdminOpenids.push(openid)
          hasOpenidChanges = true
        }
      })
      if (hasOpenidChanges) {
        updateConfigData.adminOpenids = newAdminOpenids
      }

      await db.collection(COL.ADMIN_CONFIG).doc('admin_config').update({
        data: updateConfigData,
      })

      // 设 staff.isAdmin = true
      await db.collection(COL.STAFF).doc(targetStaff._id).update({
        data: {
          isAdmin: true,
          updatedAt: db.serverDate(),
        },
      })

      return success(null)
    }

    if (action === 'remove') {
      // 校验至少保留1个管理员
      if (adminConfig.adminPhones.length < 2) {
        return fail(E0305)
      }

      // 从 adminPhones 移除
      const newPhones = adminConfig.adminPhones.filter((p) => p !== targetPhone)
      const targetOpenids = normalizeStaffOpenids(targetStaff)
      // 从 adminOpenids 移除
      const newOpenids = adminConfig.adminOpenids.filter((o) => !targetOpenids.includes(o))

      await db.collection(COL.ADMIN_CONFIG).doc('admin_config').update({
        data: {
          adminPhones: newPhones,
          adminOpenids: newOpenids,
          updatedAt: db.serverDate(),
        },
      })

      // 设 staff.isAdmin = false
      await db.collection(COL.STAFF).doc(targetStaff._id).update({
        data: {
          isAdmin: false,
          updatedAt: db.serverDate(),
        },
      })

      return success(null)
    }
  } catch (err) {
    console.error('[transferAdmin] error:', err?.message || String(err))
    return fail(E0102)
  }
}
