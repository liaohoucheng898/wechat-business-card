/**
 * sendSmsCode - send SMS verification code
 */
const cloud = require('wx-server-sdk')
const { sms } = require('tencentcloud-sdk-nodejs')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0203, E0204, E0205, E0209, E0211, E0212 } = require('./_shared/error-codes')
const { COL, getDb, getStaffByPhone, getAdminConfig } = require('./_shared/db')
const { isValidPhone, checkRequired } = require('./_shared/validate')

const SMS_CONFIG = {
  secretId: process.env.SMS_SECRET_ID || '',
  secretKey: process.env.SMS_SECRET_KEY || '',
  smsSdkAppId: process.env.SMS_SDK_APP_ID || '',
  signName: process.env.SMS_SIGN_NAME || '',
  templateId: process.env.SMS_TEMPLATE_ID || '',
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

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

  const { phone, scene } = params

  try {
    const { valid, missing } = checkRequired(params, ['phone', 'scene'])
    if (!valid) {
      return respond(event, fail(E0101, `缺少参数: ${missing}`))
    }

    if (!isValidPhone(phone)) {
      return respond(event, fail(E0101, '手机号格式错误'))
    }

    if (!['bind', 'login'].includes(scene)) {
      return respond(event, fail(E0101, 'scene 参数无效'))
    }

    if (isHttpRequest(event) && scene !== 'login') {
      return respond(event, fail(E0101, 'PC 管理端仅支持登录验证码'))
    }

    const db = getDb()
    const _ = db.command
    const now = Date.now()
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0))

    const staff = await getStaffByPhone(phone)
    if (!staff) {
      return respond(event, fail(E0209))
    }

    if (isHttpRequest(event)) {
      if (staff.status === 'disabled') {
        return respond(event, fail(E0211))
      }

      const adminConfig = await getAdminConfig()
      if (!staff.isAdmin || !adminConfig || !adminConfig.adminPhones.includes(phone)) {
        return respond(event, fail(E0212))
      }
    }

    const { data: recentCodes } = await db.collection(COL.SMS_CODES)
      .where({
        phone,
        createdAt: _.gte(new Date(now - 60 * 1000)),
      })
      .limit(1)
      .get()

    if (recentCodes.length > 0) {
      return respond(event, fail(E0203))
    }

    const { total: dailyCount } = await db.collection(COL.SMS_CODES)
      .where({
        phone,
        createdAt: _.gte(todayStart),
      })
      .count()

    if (dailyCount >= 20) {
      return respond(event, fail(E0204))
    }

    const { OPENID } = cloud.getWXContext()
    if (OPENID) {
      const { total: deviceCount } = await db.collection(COL.SMS_CODES)
        .where({
          openid: OPENID,
          createdAt: _.gte(todayStart),
        })
        .count()

      if (deviceCount >= 20) {
        return respond(event, fail(E0205))
      }
    }

    const code = generateCode()
    const expireAt = new Date(now + 5 * 60 * 1000)

    const SmsClient = sms.v20210111.Client
    const client = new SmsClient({
      credential: {
        secretId: SMS_CONFIG.secretId,
        secretKey: SMS_CONFIG.secretKey,
      },
      region: 'ap-guangzhou',
    })

    const sendResult = await client.SendSms({
      SmsSdkAppId: SMS_CONFIG.smsSdkAppId,
      SignName: SMS_CONFIG.signName,
      TemplateId: SMS_CONFIG.templateId,
      PhoneNumberSet: [`+86${phone}`],
      TemplateParamSet: [code, '5'],
    })

    await db.collection(COL.SMS_CODES).add({
      data: {
        phone,
        code,
        scene,
        openid: OPENID || '',
        expireAt,
        used: false,
        errorCount: 0,
        lockedUntil: null,
        createdAt: db.serverDate(),
      },
    })

    return respond(event, success({ expireIn: 300 }))
  } catch (error) {
    console.error('[sendSmsCode] error:', error?.message || String(error))
    return respond(event, fail(E0102))
  }
}
