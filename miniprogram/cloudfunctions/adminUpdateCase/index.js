const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0104, E0501, E0502 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')
const { sanitizeRichText } = require('./_shared/richtext')

exports.main = async (event) => {
  try {
    const { caseId, pageLoadedAt, fields } = event

    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!caseId) {
      return fail(E0101, '缺少 caseId')
    }
    if (!pageLoadedAt) {
      return fail(E0101, '缺少 pageLoadedAt')
    }
    if (!fields || typeof fields !== 'object') {
      return fail(E0101, '缺少 fields')
    }

    const db = getDb()
    let caseDoc
    try {
      const { data } = await db.collection(COL.CASES).doc(caseId).get()
      caseDoc = data
    } catch (error) {
      return fail(E0501)
    }

    if (!caseDoc) {
      return fail(E0501)
    }
    if (caseDoc.deleted) {
      return fail(E0502)
    }

    const dbUpdatedAt = caseDoc.updatedAt ? caseDoc.updatedAt.getTime() : 0
    if (dbUpdatedAt > pageLoadedAt) {
      return fail(E0104)
    }

    if (fields.title !== undefined && (!fields.title || !fields.title.trim())) {
      return fail(E0101, '标题不能为空')
    }
    if (fields.description !== undefined) {
      const normalizedDescription = typeof fields.description === 'string' ? fields.description.trim() : ''
      if (normalizedDescription.length > 200) {
        return fail(E0101, '简要描述不超过200字')
      }
    }
    if (fields.companyIds !== undefined) {
      if (!Array.isArray(fields.companyIds) || fields.companyIds.length === 0) {
        return fail(E0101, '至少选择一家公司')
      }
    }

    const updateData = { updatedAt: db.serverDate() }
    const allowedFields = ['title', 'cover', 'coverThumb', 'description', 'content', 'sort', 'visible', 'companyIds', 'categoryIds']
    allowedFields.forEach((key) => {
      if (fields[key] === undefined) return
      if (key === 'title' || key === 'description') {
        updateData[key] = typeof fields[key] === 'string' ? fields[key].trim() : ''
        return
      }
      if (key === 'content') {
        updateData[key] = sanitizeRichText(fields[key] || '')
        return
      }
      updateData[key] = fields[key]
    })

    await db.collection(COL.CASES).doc(caseId).update({ data: updateData })

    const { data: updated } = await db.collection(COL.CASES).doc(caseId).get()
    const newUpdatedAt = updated.updatedAt ? updated.updatedAt.getTime() : Date.now()

    return success({ updatedAt: newUpdatedAt })
  } catch (error) {
    console.error('[adminUpdateCase] error:', error?.message || String(error))
    return fail(E0102)
  }
}
