const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0104, E0301, E0302, E0303, E0305 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getStaffById, getStaffByPhone, getAdminConfig, normalizeStaffOpenids } = require('./_shared/db')
const { isValidPhone, isValidName, isValidEmail, isValidBio } = require('./_shared/validate')

function sanitizeWechatBindings(staff = {}, bindings = []) {
  const currentOpenids = normalizeStaffOpenids(staff)
  const remarkMap = new Map()

  bindings.forEach((item) => {
    const openid = String(item?.openid || '').trim()
    const remark = String(item?.remark || '').trim()

    if (openid && currentOpenids.includes(openid)) {
      remarkMap.set(openid, remark)
    }
  })

  return currentOpenids.map((openid) => ({
    openid,
    remark: remarkMap.get(openid) || '',
  }))
}

exports.main = async (event) => {
  try {
    const { staffId, pageLoadedAt, fields } = event

    const { customUserId: operatorId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(operatorId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!staffId) {
      return fail(E0101, '缺少 staffId')
    }
    if (!pageLoadedAt) {
      return fail(E0101, '缺少 pageLoadedAt')
    }
    if (!fields || typeof fields !== 'object') {
      return fail(E0101, '缺少 fields')
    }

    const staff = await getStaffById(staffId)
    if (!staff) {
      return fail(E0302)
    }

    const dbUpdatedAt = staff.updatedAt ? staff.updatedAt.getTime() : 0
    if (dbUpdatedAt > pageLoadedAt) {
      return fail(E0104)
    }

    if (fields.name !== undefined && !isValidName(fields.name)) {
      return fail(E0101, '姓名格式错误，1-20字')
    }
    if (fields.phone !== undefined && !isValidPhone(fields.phone)) {
      return fail(E0101, '手机号格式错误')
    }
    if (fields.secondPhone !== undefined) {
      fields.secondPhone = String(fields.secondPhone || '').trim()
      if (fields.secondPhone && !isValidPhone(fields.secondPhone)) {
        return fail(E0101, '第二个手机号格式错误')
      }
    }
    if (fields.email !== undefined && fields.email && !isValidEmail(fields.email)) {
      return fail(E0101, '邮箱格式错误')
    }
    if (fields.bio !== undefined && fields.bio && !isValidBio(fields.bio)) {
      return fail(E0101, '个人简介不能超过100字')
    }
    if (fields.enabledCompanies !== undefined) {
      if (!Array.isArray(fields.enabledCompanies) || fields.enabledCompanies.length === 0) {
        return fail(E0303)
      }
      for (const company of fields.enabledCompanies) {
        if (!company.companyId) {
          return fail(E0101, 'enabledCompanies 需要包含 companyId')
        }
      }
    }
    if (fields.isAdmin !== undefined && typeof fields.isAdmin !== 'boolean') {
      return fail(E0101, 'isAdmin 必须是布尔值')
    }
    if (fields.showSecondPhone !== undefined && typeof fields.showSecondPhone !== 'boolean') {
      return fail(E0101, 'showSecondPhone 必须是布尔值')
    }
    if (fields.wechatBindings !== undefined) {
      if (!Array.isArray(fields.wechatBindings)) {
        return fail(E0101, 'wechatBindings 必须是数组')
      }
      const invalidRemark = fields.wechatBindings.find((item) => String(item?.remark || '').trim().length > 30)
      if (invalidRemark) {
        return fail(E0101, '微信备注不能超过30字')
      }
    }

    const oldPhone = staff.phone
    const oldIsAdmin = !!staff.isAdmin
    const nextPhone = fields.phone !== undefined ? fields.phone : oldPhone
    const nextIsAdmin = fields.isAdmin !== undefined ? fields.isAdmin : oldIsAdmin

    let phoneChanged = false
    if (fields.phone !== undefined && fields.phone !== oldPhone) {
      phoneChanged = true
      const existing = await getStaffByPhone(fields.phone)
      if (existing) {
        return fail(E0301)
      }
    }

    if (fields.secondPhone !== undefined && !fields.secondPhone) {
      fields.showSecondPhone = false
    }
    if (fields.showSecondPhone !== undefined) {
      const effectiveSecondPhone = fields.secondPhone !== undefined ? fields.secondPhone : (staff.secondPhone || '')
      fields.showSecondPhone = !!fields.showSecondPhone && !!effectiveSecondPhone
    }

    const db = getDb()
    const shouldSyncAdminConfig = phoneChanged || nextIsAdmin !== oldIsAdmin
    let nextAdminPhones = null
    let nextAdminOpenids = null

    if (shouldSyncAdminConfig) {
      const adminConfig = await getAdminConfig()
      const phoneSet = new Set(Array.isArray(adminConfig?.adminPhones) ? adminConfig.adminPhones : [])
      const openidSet = new Set(Array.isArray(adminConfig?.adminOpenids) ? adminConfig.adminOpenids : [])

      const staffOpenids = normalizeStaffOpenids(staff)

      if (oldIsAdmin) {
        phoneSet.delete(oldPhone)
        staffOpenids.forEach((openid) => openidSet.delete(openid))
      }

      if (nextIsAdmin) {
        phoneSet.add(nextPhone)
        staffOpenids.forEach((openid) => openidSet.add(openid))
      }

      if (phoneSet.size === 0) {
        return fail(E0305)
      }

      nextAdminPhones = Array.from(phoneSet)
      nextAdminOpenids = Array.from(openidSet)
    }

    if (fields.avatar !== undefined && fields.avatarOriginal === undefined) {
      fields.avatarOriginal = fields.avatar
    }
    if (fields.avatarOriginal !== undefined && fields.avatar === undefined) {
      fields.avatar = fields.avatarOriginal
    }

    const updateData = { updatedAt: db.serverDate() }
    const allowedFields = [
      'name',
      'phone',
      'secondPhone',
      'showSecondPhone',
      'wechat',
      'email',
      'bio',
      'avatar',
      'avatarOriginal',
      'enabledCompanies',
      'wechatBindings',
      'isAdmin',
    ]

    for (const key of allowedFields) {
      if (fields[key] === undefined) {
        continue
      }

      if (key === 'name') {
        updateData[key] = fields[key].trim()
      } else if (key === 'enabledCompanies') {
        updateData[key] = fields[key].map((company) => ({
          companyId: company.companyId,
          title: company.title,
        }))
      } else if (key === 'wechatBindings') {
        updateData[key] = sanitizeWechatBindings(staff, fields[key])
      } else {
        updateData[key] = fields[key]
      }
    }

    await db.collection(COL.STAFF).doc(staffId).update({ data: updateData })

    if (shouldSyncAdminConfig) {
      const adminConfigRef = db.collection(COL.ADMIN_CONFIG).doc('admin_config')
      const adminConfigData = {
        adminPhones: nextAdminPhones,
        adminOpenids: nextAdminOpenids,
        updatedAt: db.serverDate(),
      }
      const currentAdminConfig = await getAdminConfig()

      if (currentAdminConfig) {
        await adminConfigRef.update({ data: adminConfigData })
      } else {
        await adminConfigRef.set({ data: adminConfigData })
      }
    }

    const updated = await getStaffById(staffId)
    const newUpdatedAt = updated.updatedAt ? updated.updatedAt.getTime() : Date.now()

    const result = success({ updatedAt: newUpdatedAt })
    return result
  } catch (error) {
    console.error('[adminUpdateStaff] error:', error?.message || String(error))
    return fail(E0102)
  }
}
