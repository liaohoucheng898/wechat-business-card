const fs = require('fs')
const path = require('path')
const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0201, E0202, E0206, E0209, E0211, E0212, E0213 } = require('./_shared/error-codes')
const { isValidPhone, isValidSmsCode, isValidPassword } = require('./_shared/validate')
const { COL, getDb, getStaffByPhone, getAdminConfig } = require('./_shared/db')
const { getPasswordStatus, verifyPassword } = require('./_shared/password')

function maskPhone(phone = '') {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://cloud1-d1gvh2zc3c5919349-1422926641.tcloudbaseapp.com',
  'https://cloud1-d1gvh2zc3c5919349-1422926641.ap-shanghai.app.tcloudbase.com',
]

function getAllowedOrigins() {
  const configured = String(process.env.ADMIN_HTTP_ALLOWED_ORIGINS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]))
}

function isLocalDevOrigin(origin = '') {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function isAllowedOrigin(origin = '') {
  return Boolean(origin) && (getAllowedOrigins().includes(origin) || isLocalDevOrigin(origin))
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

function isHttpRequest(event) {
  return Boolean(event && typeof event === 'object' && typeof event.httpMethod === 'string')
}

function getHttpMethod(event) {
  return String(event?.httpMethod || '').toUpperCase()
}

function getHeader(headers = {}, name) {
  const target = String(name || '').toLowerCase()
  const matchedKey = Object.keys(headers).find((key) => String(key).toLowerCase() === target)
  return matchedKey ? headers[matchedKey] : ''
}

function getCorsHeaders(event) {
  const origin = getHeader(event?.headers, 'origin')
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
  }
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function wrapHttpResponse(event, payload, statusCode = 200) {
  return {
    statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify(payload),
  }
}

function parseHttpBody(event) {
  if (!event || event.body == null || event.body === '') {
    return {}
  }

  if (typeof event.body === 'object') {
    return event.body
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : String(event.body)

  if (!rawBody.trim()) {
    return {}
  }

  return JSON.parse(rawBody)
}

function getRequestParams(event) {
  if (!isHttpRequest(event)) {
    return event || {}
  }
  return parseHttpBody(event)
}

function respond(event, payload, statusCode = 200) {
  return isHttpRequest(event) ? wrapHttpResponse(event, payload, statusCode) : payload
}

function rejectDisallowedOrigin(event) {
  if (!isHttpRequest(event)) return null
  const origin = getHeader(event?.headers, 'origin')
  if (isAllowedOrigin(origin)) return null
  return wrapHttpResponse(event, fail(E0101, '请求来源不允许'), 403)
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
    console.error('[adminLogin] getTempFileURL failed:', error?.message || String(error))
    return ''
  }
}

async function validateSmsLogin({ db, phone, smsCode, now }) {
  if (!smsCode || !isValidSmsCode(smsCode)) {
    return fail(E0101, '验证码格式不正确')
  }

  const _ = db.command
  const { data: codeList } = await db.collection(COL.SMS_CODES)
    .where({
      phone,
      scene: 'login',
      used: _.neq(true),
    })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (!codeList.length) {
    return fail(E0201)
  }

  const codeRecord = codeList[0]
  if (codeRecord.lockedUntil && codeRecord.lockedUntil.getTime() > now) {
    return fail(E0206)
  }

  if (codeRecord.createdAt.getTime() + 5 * 60 * 1000 < now) {
    return fail(E0201)
  }

  if (codeRecord.code !== smsCode) {
    const errorCount = Number(codeRecord.errorCount || 0) + 1
    const updateData = { errorCount }
    if (errorCount >= 5) {
      updateData.lockedUntil = new Date(now + 15 * 60 * 1000)
    }

    await db.collection(COL.SMS_CODES).doc(codeRecord._id).update({ data: updateData })

    if (errorCount >= 5) {
      return fail(E0206)
    }
    return fail(E0202)
  }

  await db.collection(COL.SMS_CODES).doc(codeRecord._id).update({
    data: { used: true },
  })

  return null
}

async function validatePasswordLogin({ db, staff, password, now }) {
  if (!password || !isValidPassword(password)) {
    return fail(E0101, '密码需 8-20 位，且必须同时包含字母和数字')
  }

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

  return null
}

exports.main = async (event = {}) => {
  const corsReject = rejectDisallowedOrigin(event)
  if (corsReject) {
    return corsReject
  }

  if (isHttpRequest(event) && getHttpMethod(event) === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: '',
    }
  }

  if (isHttpRequest(event) && getHttpMethod(event) !== 'POST') {
    return respond(event, fail(E0101, '仅支持 POST 请求'), 405)
  }

  let params = {}
  try {
    params = getRequestParams(event)
  } catch (error) {
    return respond(event, fail(E0101, '请求体格式不正确'), 400)
  }

  const isPasswordLogin = params.loginMode === 'password' || (!!params.password && !params.smsCode)

  try {
    const { phone, smsCode, password } = params
    if (!phone || !isValidPhone(phone)) {
      return respond(event, fail(E0101, '手机号格式不正确'))
    }

    const db = getDb()
    const now = Date.now()
    const staff = await getStaffByPhone(phone)
    if (!staff) {
      return respond(event, fail(E0209))
    }
    if (staff.status === 'disabled') {
      return respond(event, fail(E0211))
    }
    if (!staff.isAdmin) {
      return respond(event, fail(E0212))
    }

    const adminConfig = await getAdminConfig()
    if (!adminConfig || !adminConfig.adminPhones.includes(phone)) {
      return respond(event, fail(E0212))
    }

    const loginError = isPasswordLogin
      ? await validatePasswordLogin({ db, staff, password, now })
      : await validateSmsLogin({ db, phone, smsCode, now })

    if (loginError) {
      return respond(event, loginError)
    }

    const ticket = tcbApp.auth().createTicket(staff._id)
    const avatarFileId = staff.avatar || staff.avatarOriginal || ''
    const passwordStatus = getPasswordStatus(staff)
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

    return respond(event, result)
  } catch (error) {
    console.error('[adminLogin] error:', error?.message || String(error))
    return respond(event, fail(E0102))
  }
}
