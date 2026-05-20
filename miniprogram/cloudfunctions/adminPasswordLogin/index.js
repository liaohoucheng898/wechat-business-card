const fs = require('fs')
const path = require('path')
const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0206, E0209, E0211, E0212, E0213 } = require('./_shared/error-codes')
const { isValidPhone, isValidPassword } = require('./_shared/validate')
const { COL, getDb, getStaffByPhone, getAdminConfig } = require('./_shared/db')
const { getPasswordStatus, verifyPassword } = require('./_shared/password')

function maskPhone(phone = '') {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

function loadCustomLoginCredentials() {
  const privateKeyId = process.env.TCB_CUSTOM_LOGIN_PRIVATE_KEY_ID || ''
  const privateKey = (process.env.TCB_CUSTOM_LOGIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  const envId = process.env.TCB_CUSTOM_LOGIN_ENV_ID || ''

  if (privateKeyId && privateKey && envId) {
    return {
      private_key_id: privateKeyId,
      private_key: privateKey,
      env_id: envId,
    }
  }

  const localCredentialPath = path.join(__dirname, 'tcb_custom_login.local.json')
  if (fs.existsSync(localCredentialPath)) {
    return require(localCredentialPath)
  }

  throw new Error('Missing CloudBase Custom Login credentials. Configure env vars or add tcb_custom_login.local.json locally.')
}

const customLoginCredentials = loadCustomLoginCredentials()
const tcbApp = tcb.init({
  env: customLoginCredentials.env_id || 'cloud1-d1gvh2zc3c5919349',
  credentials: customLoginCredentials,
})

async function resolveFileUrl(fileID) {
  if (!fileID) return ''
  if (!fileID.startsWith('cloud://')) return fileID

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] })
    return (fileList && fileList[0] && fileList[0].tempFileURL) || ''
  } catch (error) {
    console.error('[adminPasswordLogin] getTempFileURL failed:', error?.message || String(error))
    return ''
  }
}

exports.main = async (event) => {
  try {
    const { phone, password } = event

    if (!phone || !isValidPhone(phone)) {
      return fail(E0101, '手机号格式错误')
    }

    if (!password || !isValidPassword(password)) {
      return fail(E0101, '密码需为8-20位，且必须同时包含字母和数字')
    }

    const db = getDb()
    const staff = await getStaffByPhone(phone)
    if (!staff) {
      return fail(E0209)
    }
    if (staff.status === 'disabled') {
      return fail(E0211)
    }
    if (!staff.isAdmin) {
      return fail(E0212)
    }

    const adminConfig = await getAdminConfig()
    if (!adminConfig || !adminConfig.adminPhones.includes(phone)) {
      return fail(E0212)
    }

    const now = Date.now()
    if (staff.passwordLockUntil && new Date(staff.passwordLockUntil).getTime() > now) {
      return fail(E0206)
    }

    const passwordStatus = getPasswordStatus(staff)
    if (passwordStatus === 'unset') {
      return fail(E0213, '该管理员账号尚未设置密码，请联系其他管理员为你重置密码')
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

    await db.collection(COL.STAFF).doc(staff._id).update({
      data: {
        passwordErrorCount: 0,
        passwordLockUntil: null,
        updatedAt: db.serverDate(),
      },
    })

    const ticket = tcbApp.auth().createTicket(staff._id)
    const avatarFileId = staff.avatar || staff.avatarOriginal || ''
    const mustChangePassword = passwordStatus === 'temporary'
    const staffInfo = {
      staffId: staff._id,
      name: staff.name,
      phone: staff.phone,
      avatar: await resolveFileUrl(avatarFileId),
      avatarOriginal: avatarFileId,
      enabledCompanies: staff.enabledCompanies || [],
      isAdmin: staff.isAdmin,
      passwordStatus,
      mustChangePassword,
    }

    const result = success({
      staffInfo,
      ticket,
      passwordStatus,
      mustChangePassword,
    })
    return result
  } catch (error) {
    console.error('[adminPasswordLogin] error:', error?.message || String(error))
    return fail(E0102)
  }
}
