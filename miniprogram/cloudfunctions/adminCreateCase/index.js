const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0401 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, getCompanyById } = require('./_shared/db')
const { sanitizeRichText } = require('./_shared/richtext')

exports.main = async (event) => {
  try {
    const { companyIds, title, cover, coverThumb, description, content, sort, visible, categoryIds } = event

    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return fail(E0101, '至少选择一家公司')
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return fail(E0101, '标题不能为空')
    }
    const normalizedDescription = typeof description === 'string' ? description.trim() : ''
    if (normalizedDescription.length > 200) {
      return fail(E0101, '简要描述不超过200字')
    }

    for (const companyId of companyIds) {
      const company = await getCompanyById(companyId)
      if (!company) {
        return fail(E0401, `公司 ${companyId} 不存在`)
      }
    }

    const db = getDb()
    const { _id: caseId } = await db.collection(COL.CASES).add({
      data: {
        companyIds,
        title: title.trim(),
        cover: cover || '',
        coverThumb: coverThumb || '',
        description: normalizedDescription,
        content: sanitizeRichText(content || ''),
        sort: typeof sort === 'number' ? sort : 100,
        visible: visible !== false,
        categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
        deleted: false,
        deletedAt: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return success({ caseId })
  } catch (error) {
    console.error('[adminCreateCase] error:', error?.message || String(error))
    return fail(E0102)
  }
}
