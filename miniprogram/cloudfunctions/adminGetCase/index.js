/**
 * adminGetCase - 获取单个案例详情
 */
const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0501, E0502 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')
const { sanitizeRichText } = require('./_shared/richtext')

exports.main = async (event) => {
  try {
    const { caseId } = event

    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!caseId) {
      return fail(E0101, '缺少 caseId')
    }

    const db = getDb()
    let caseDoc
    try {
      const { data } = await db.collection(COL.CASES).doc(caseId).get()
      caseDoc = data
    } catch (error) {
      if (error.errCode === -1) return fail(E0501)
      throw error
    }

    if (!caseDoc) {
      return fail(E0501)
    }
    if (caseDoc.deleted) {
      return fail(E0502)
    }

    return success({
      caseId: caseDoc._id,
      companyIds: caseDoc.companyIds || [],
      title: caseDoc.title,
      cover: caseDoc.cover,
      coverThumb: caseDoc.coverThumb || '',
      description: caseDoc.description,
      content: sanitizeRichText(caseDoc.content || ''),
      sort: caseDoc.sort,
      visible: caseDoc.visible,
      categoryIds: caseDoc.categoryIds || [],
      createdAt: caseDoc.createdAt ? caseDoc.createdAt.getTime() : 0,
      updatedAt: caseDoc.updatedAt ? caseDoc.updatedAt.getTime() : 0,
    })
  } catch (error) {
    console.error('[adminGetCase] error:', error?.message || String(error))
    return fail(E0102)
  }
}
