const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0104, E0401 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getCompanyById } = require('./_shared/db')
const { sanitizeRichText } = require('./_shared/richtext')

exports.main = async (event) => {
  try {
    const { companyId, pageLoadedAt, fields } = event

    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!companyId) {
      return fail(E0101, '缺少 companyId')
    }
    if (!pageLoadedAt) {
      return fail(E0101, '缺少 pageLoadedAt')
    }
    if (!fields || typeof fields !== 'object') {
      return fail(E0101, '缺少 fields')
    }

    const company = await getCompanyById(companyId)
    if (!company) {
      return fail(E0401)
    }

    const dbUpdatedAt = company.updatedAt ? company.updatedAt.getTime() : 0
    if (dbUpdatedAt > pageLoadedAt) {
      return fail(E0104)
    }

    const requiredInFields = ['name', 'address', 'phone', 'latitude', 'longitude', 'locationName']
    requiredInFields.forEach((key) => {
      if (fields[key] !== undefined && (fields[key] === null || fields[key] === '')) {
        throw { code: E0101, message: `${key} 不能为空` }
      }
    })

    if (fields.latitude !== undefined && typeof fields.latitude !== 'number') {
      return fail(E0101, 'latitude 必须为数字')
    }
    if (fields.longitude !== undefined && typeof fields.longitude !== 'number') {
      return fail(E0101, 'longitude 必须为数字')
    }

    const db = getDb()
    const updateData = { updatedAt: db.serverDate() }
    const allowedFields = ['name', 'logo', 'intro', 'businessIntro', 'address', 'phone', 'latitude', 'longitude', 'locationName', 'website']
    allowedFields.forEach((key) => {
      if (fields[key] === undefined) return
      if (key === 'intro' || key === 'businessIntro') {
        updateData[key] = sanitizeRichText(fields[key] || '')
        return
      }
      updateData[key] = fields[key]
    })

    await db.collection(COL.COMPANIES).doc(companyId).update({ data: updateData })

    const updated = await getCompanyById(companyId)
    const newUpdatedAt = updated.updatedAt ? updated.updatedAt.getTime() : Date.now()

    return success({ updatedAt: newUpdatedAt })
  } catch (error) {
    if (error && error.code === E0101) {
      return fail(error.code, error.message)
    }
    console.error('[adminUpdateCompany] error:', error?.message || String(error))
    return fail(E0102)
  }
}
