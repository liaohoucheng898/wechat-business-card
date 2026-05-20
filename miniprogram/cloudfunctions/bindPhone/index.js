/**
 * bindPhone - 绑定手机号
 */
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const {
  E0101, E0102, E0201, E0202, E0206,
  E0209, E0210, E0211,
} = require('./_shared/error-codes')
const { COL, getDb, getStaffByPhone, getAdminConfig } = require('./_shared/db')
const { isValidPhone, isValidSmsCode, checkRequired } = require('./_shared/validate')
const { getPasswordStatus } = require('./_shared/password')

async function resolveFileUrl(fileID) {
  if (!fileID) return ''
  if (!fileID.startsWith('cloud://')) return fileID

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] })
    return (fileList && fileList[0] && fileList[0].tempFileURL) || ''
  } catch (error) {
    console.error('[bindPhone] getTempFileURL failed:', error?.message || String(error))
    return ''
  }
}

async function verifySmsCode(db, phone, inputCode) {
  const now = new Date()

  const { data: codes } = await db.collection(COL.SMS_CODES)
    .where({ phone, scene: 'bind', used: false })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (!codes.length) {
    return { valid: false, error: E0201 }
  }

  const record = codes[0]

  if (record.lockedUntil && new Date(record.lockedUntil) > now) {
    return { valid: false, error: E0206 }
  }

  if (new Date(record.expireAt) < now) {
    return { valid: false, error: E0201 }
  }

  if (record.code !== inputCode) {
    const newErrorCount = (record.errorCount || 0) + 1
    const updateData = { errorCount: newErrorCount }

    if (newErrorCount >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000)
    }

    await db.collection(COL.SMS_CODES).doc(record._id).update({ data: updateData })

    if (newErrorCount >= 5) {
      return { valid: false, error: E0206 }
    }
    return { valid: false, error: E0202 }
  }

  await db.collection(COL.SMS_CODES).doc(record._id).update({
    data: { used: true },
  })

  return { valid: true }
}

function maskPhone(phone = '') {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

exports.main = async (event) => {
  const { phone, smsCode } = event
  const { OPENID } = cloud.getWXContext()

  try {
    const { valid, missing } = checkRequired(event, ['phone', 'smsCode'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    if (!isValidPhone(phone)) {
      return fail(E0101, '手机号格式错误')
    }

    if (!isValidSmsCode(smsCode)) {
      return fail(E0101, '验证码格式错误')
    }

    const db = getDb()
    const smsResult = await verifySmsCode(db, phone, smsCode)
    if (!smsResult.valid) {
      return fail(smsResult.error)
    }

    const staff = await getStaffByPhone(phone)
    if (!staff) {
      return fail(E0209)
    }

    if (staff.status === 'disabled') {
      return fail(E0211)
    }

    if (staff.openid && staff.openid !== OPENID) {
      return fail(E0210)
    }

    const sessionToken = crypto.randomBytes(16).toString('hex')
    const sessionExpireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const updateData = {
      openid: OPENID,
      sessionToken,
      sessionExpireAt,
      updatedAt: db.serverDate(),
    }

    await db.collection(COL.STAFF).doc(staff._id).update({ data: updateData })

    if (staff.isAdmin) {
      const adminConfig = await getAdminConfig()
      if (adminConfig && !adminConfig.adminOpenids.includes(OPENID)) {
        await db.collection(COL.ADMIN_CONFIG).doc('admin_config').update({
          data: {
            adminOpenids: db.command.addToSet(OPENID),
            updatedAt: db.serverDate(),
          },
        })
      }
    }

    const avatarFileId = staff.avatar || staff.avatarOriginal || ''
    const passwordStatus = getPasswordStatus(staff)
    const mustChangePassword = passwordStatus === 'temporary'
    const staffInfo = {
      staffId: staff._id,
      name: staff.name,
      phone: staff.phone,
      wechat: staff.wechat || '',
      email: staff.email || '',
      bio: staff.bio || '',
      avatar: await resolveFileUrl(avatarFileId),
      avatarOriginal: avatarFileId,
      enabledCompanies: staff.enabledCompanies || [],
      isAdmin: staff.isAdmin || false,
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
    console.error('[bindPhone] error:', error?.message || String(error))
    return fail(E0102)
  }
}
