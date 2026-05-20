const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0301, E0303 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getStaffByPhone } = require('./_shared/db')
const { isValidPhone, isValidName, isValidEmail, isValidBio } = require('./_shared/validate')
const { buildPasswordFields, generateTempPassword } = require('./_shared/password')

exports.main = async (event) => {
  try {
    const {
      name,
      phone,
      secondPhone,
      showSecondPhone,
      wechat,
      email,
      bio,
      avatar,
      enabledCompanies,
    } = event

    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!name || !isValidName(name)) {
      return fail(E0101, '姓名格式错误，1-20字，支持中英文数字')
    }
    if (!phone || !isValidPhone(phone)) {
      return fail(E0101, '手机号格式错误')
    }
    if (secondPhone && !isValidPhone(secondPhone)) {
      return fail(E0101, '第二个手机号格式错误')
    }
    if (email && !isValidEmail(email)) {
      return fail(E0101, '邮箱格式错误')
    }
    if (bio && !isValidBio(bio)) {
      return fail(E0101, '个人简介不能超过100字')
    }
    if (!enabledCompanies || !Array.isArray(enabledCompanies) || enabledCompanies.length === 0) {
      return fail(E0303)
    }

    for (const ec of enabledCompanies) {
      if (!ec.companyId) {
        return fail(E0101, 'enabledCompanies 需要包含 companyId')
      }
    }

    const existing = await getStaffByPhone(phone)
    if (existing) {
      return fail(E0301)
    }

    const db = getDb()
    const companies = enabledCompanies.map((ec) => ({
      companyId: ec.companyId,
      title: ec.title,
    }))

    const temporaryPassword = generateTempPassword(8)
    const passwordFields = await buildPasswordFields(temporaryPassword, { temporary: true })

    const { _id: newStaffId } = await db.collection(COL.STAFF).add({
      data: {
        name: name.trim(),
        phone,
        secondPhone: secondPhone || '',
        showSecondPhone: !!secondPhone && !!showSecondPhone,
        openid: null,
        openids: [],
        wechat: wechat || '',
        email: email || '',
        bio: bio || '',
        avatar: avatar || '',
        avatarOriginal: avatar || '',
        enabledCompanies: companies,
        status: 'active',
        isAdmin: false,
        sessionToken: null,
        sessionExpireAt: null,
        pcSessionToken: null,
        pcSessionExpireAt: null,
        ...passwordFields,
        passwordUpdatedAt: db.serverDate(),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    const result = success({
      staffId: newStaffId,
      phone,
      temporaryPassword,
      passwordStatus: 'temporary',
      mustChangePassword: true,
    })
    return result
  } catch (error) {
    console.error('[adminCreateStaff] error:', error?.message || String(error))
    return fail(E0102)
  }
}
