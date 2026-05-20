const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0301 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getStaffByPhone } = require('./_shared/db')
const { isValidName, isValidPhone } = require('./_shared/validate')

const COMPANY_IDS = {
  HUAYUE: 'company_001',
  HUABAO: 'company_002',
}
const MAX_IMPORT_ROWS = 500
const FIELD_LIMITS = {
  name: 20,
  phone: 11,
  huayueTitle: 30,
  huabaoTitle: 30,
}
const FORMULA_PREFIX_RE = /^[=+\-@]/

function normalizeRow(row = {}, index = 0) {
  return {
    rowNumber: Number(row.rowNumber) || index + 2,
    name: String(row.name || '').trim(),
    phone: String(row.phone || '').replace(/\s+/g, '').trim(),
    huayueTitle: String(row.huayueTitle || '').trim(),
    huabaoTitle: String(row.huabaoTitle || '').trim(),
  }
}

function buildFailResult(row, reason) {
  return {
    rowNumber: row.rowNumber,
    name: row.name,
    phone: row.phone,
    reason,
  }
}

function hasFormulaPrefix(value = '') {
  return FORMULA_PREFIX_RE.test(String(value || '').trim())
}

function validateRowSafety(row) {
  if (row.name.length > FIELD_LIMITS.name) {
    return `姓名不能超过 ${FIELD_LIMITS.name} 个字`
  }
  if (row.phone.length > FIELD_LIMITS.phone) {
    return `手机号不能超过 ${FIELD_LIMITS.phone} 位`
  }
  if (row.huayueTitle.length > FIELD_LIMITS.huayueTitle) {
    return `华悦职位不能超过 ${FIELD_LIMITS.huayueTitle} 个字`
  }
  if (row.huabaoTitle.length > FIELD_LIMITS.huabaoTitle) {
    return `华宝职位不能超过 ${FIELD_LIMITS.huabaoTitle} 个字`
  }
  if ([row.name, row.phone, row.huayueTitle, row.huabaoTitle].some(hasFormulaPrefix)) {
    return '不支持公式或特殊符号开头的内容'
  }
  return ''
}

exports.main = async (event) => {
  try {
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    const rows = Array.isArray(event.rows) ? event.rows : []
    if (!rows.length) {
      return fail(E0101, '请先上传需要导入的员工数据')
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return fail(E0101, `单次最多导入 ${MAX_IMPORT_ROWS} 条员工数据`)
    }

    const db = getDb()
    const seenPhones = new Set()
    const failures = []
    let successCount = 0

    for (let index = 0; index < rows.length; index += 1) {
      const row = normalizeRow(rows[index], index)
      const safetyError = validateRowSafety(row)
      if (safetyError) {
        failures.push(buildFailResult(row, safetyError))
        continue
      }

      if (!row.name) {
        failures.push(buildFailResult(row, '姓名不能为空'))
        continue
      }

      if (!isValidName(row.name)) {
        failures.push(buildFailResult(row, '姓名格式错误，请填写2到20位中文、英文或数字'))
        continue
      }

      if (!row.phone) {
        failures.push(buildFailResult(row, '手机号不能为空'))
        continue
      }

      if (!isValidPhone(row.phone)) {
        failures.push(buildFailResult(row, '手机号格式错误'))
        continue
      }

      const enabledCompanies = []
      if (row.huayueTitle) {
        enabledCompanies.push({
          companyId: COMPANY_IDS.HUAYUE,
          title: row.huayueTitle,
        })
      }
      if (row.huabaoTitle) {
        enabledCompanies.push({
          companyId: COMPANY_IDS.HUABAO,
          title: row.huabaoTitle,
        })
      }

      if (!enabledCompanies.length) {
        failures.push(buildFailResult(row, '至少开通一家公司'))
        continue
      }

      if (seenPhones.has(row.phone)) {
        failures.push(buildFailResult(row, 'Excel 中手机号重复'))
        continue
      }
      seenPhones.add(row.phone)

      const existing = await getStaffByPhone(row.phone)
      if (existing) {
        failures.push(buildFailResult(row, E0301.msg))
        continue
      }

      await db.collection(COL.STAFF).add({
        data: {
          name: row.name,
          phone: row.phone,
          openid: null,
          openids: [],
          wechat: '',
          email: '',
          bio: '',
          avatar: '',
          avatarOriginal: '',
          enabledCompanies,
          status: 'active',
          isAdmin: false,
          sessionToken: null,
          sessionExpireAt: null,
          pcSessionToken: null,
          pcSessionExpireAt: null,
          passwordHash: '',
          passwordSalt: '',
          passwordStatus: 'unset',
          mustChangePassword: false,
          passwordErrorCount: 0,
          passwordLockUntil: null,
          passwordUpdatedAt: null,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })

      successCount += 1
    }

    const result = {
      total: rows.length,
      successCount,
      failCount: failures.length,
      failures,
    }

    return success(result)
  } catch (error) {
    console.error('[adminImportStaff] error:', error?.message || String(error))
    return fail(E0102)
  }
}
