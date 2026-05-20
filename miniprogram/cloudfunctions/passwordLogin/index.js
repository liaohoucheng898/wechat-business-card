const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0206, E0209, E0211, E0213 } = require('./_shared/error-codes')
const { COL, getDb, getStaffByPhone, getAdminConfig, normalizeStaffOpenids } = require('./_shared/db')
const { isValidPhone, isValidPassword, checkRequired } = require('./_shared/validate')
const { getPasswordStatus, verifyPassword } = require('./_shared/password')

async function resolveFileUrl(fileID) {
  if (!fileID) return ''
  if (!fileID.startsWith('cloud://')) return fileID

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] })
    return (fileList && fileList[0] && fileList[0].tempFileURL) || ''
  } catch (error) {
    console.error('[passwordLogin] getTempFileURL failed:', error?.message || String(error))
    return ''
  }
}

function maskPhone(phone = '') {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

function normalizeWechatBindings(staff = {}, boundOpenids = normalizeStaffOpenids(staff)) {
  const remarkMap = new Map()

  if (Array.isArray(staff.wechatBindings)) {
    staff.wechatBindings.forEach((item) => {
      const openid = String(item?.openid || '').trim()
      if (openid) {
        remarkMap.set(openid, String(item?.remark || '').trim())
      }
    })
  }

  return boundOpenids.map((openid) => ({
    openid,
    remark: remarkMap.get(openid) || '',
  }))
}

exports.main = async (event) => {
  const { phone, password } = event
  const { OPENID } = cloud.getWXContext()

  try {
    const { valid, missing } = checkRequired(event, ['phone', 'password'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    if (!isValidPhone(phone)) {
      return fail(E0101, '手机号格式错误')
    }

    if (!isValidPassword(password)) {
      return fail(E0101, '密码需 8-20 位，且必须同时包含字母和数字')
    }

    const db = getDb()
    const staff = await getStaffByPhone(phone)
    if (!staff) {
      return fail(E0209)
    }

    if (staff.status === 'disabled') {
      return fail(E0211)
    }

    const now = Date.now()
    if (staff.passwordLockUntil && new Date(staff.passwordLockUntil).getTime() > now) {
      return fail(E0206)
    }

    const passwordStatus = getPasswordStatus(staff)
    if (passwordStatus === 'unset') {
      return fail(E0213, '该账号尚未设置密码，请联系管理员重置密码')
    }

    const passwordValid = await verifyPassword(password, staff)
    if (!passwordValid) {
      const errorCount = Number(staff.passwordErrorCount || 0) + 1
      const updateData = {
        passwordErrorCount: errorCount,
        updatedAt: db.serverDate(),
      }

      if (errorCount >= 5) {
        updateData.passwordLockUntil = new Date(now + 15 * 60 * 1000)
      }

      await db.collection(COL.STAFF).doc(staff._id).update({ data: updateData })

      if (errorCount >= 5) {
        return fail(E0206)
      }
      return fail(E0213)
    }

    const sessionToken = crypto.randomBytes(16).toString('hex')
    const sessionExpireAt = new Date(now + 7 * 24 * 60 * 60 * 1000)
    const boundOpenids = normalizeStaffOpenids(staff)
    const hasCurrentOpenid = boundOpenids.includes(OPENID)

    if (OPENID && !hasCurrentOpenid) {
      boundOpenids.push(OPENID)
    }

    const updateData = {
      sessionToken,
      sessionExpireAt,
      passwordErrorCount: 0,
      passwordLockUntil: null,
      openids: boundOpenids,
      wechatBindings: normalizeWechatBindings(staff, boundOpenids),
      updatedAt: db.serverDate(),
    }

    if (!staff.openid && OPENID) {
      updateData.openid = OPENID
    }

    await db.collection(COL.STAFF).doc(staff._id).update({ data: updateData })

    if (staff.isAdmin && OPENID) {
      const adminConfig = await getAdminConfig()
      if (adminConfig && OPENID && !adminConfig.adminOpenids.includes(OPENID)) {
        await db.collection(COL.ADMIN_CONFIG).doc('admin_config').update({
          data: {
            adminOpenids: db.command.addToSet(OPENID),
            updatedAt: db.serverDate(),
          },
        })
      }
    }

    const avatarFileId = staff.avatar || staff.avatarOriginal || ''
    const mustChangePassword = passwordStatus === 'temporary'
    const staffInfo = {
      staffId: staff._id,
      name: staff.name,
      phone: staff.phone,
      secondPhone: staff.secondPhone || '',
      showSecondPhone: !!staff.showSecondPhone,
      wechat: staff.wechat || '',
      email: staff.email || '',
      bio: staff.bio || '',
      avatar: await resolveFileUrl(avatarFileId),
      avatarOriginal: avatarFileId,
      enabledCompanies: staff.enabledCompanies || [],
      isAdmin: !!staff.isAdmin,
      passwordStatus,
      mustChangePassword,
    }

    return success({
      needBind: false,
      staffInfo,
      sessionToken,
      sessionExpireAt: sessionExpireAt.getTime(),
      passwordStatus,
      mustChangePassword,
    })
  } catch (error) {
    console.error('[passwordLogin] error:', error?.message || String(error))
    return fail(E0102)
  }
}
