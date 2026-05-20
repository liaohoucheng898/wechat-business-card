/**
 * adminGetCaseList — 获取案例列表
 * 触发：PC端案例管理页加载
 * 鉴权：管理员Token
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// PC端鉴权：通过 @cloudbase/node-sdk 取 Custom Login 的 customUserId（即 staffId）
const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()


const { success, fail } = require('./_shared/response')
const { E0102 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')

exports.main = async (event) => {
  try {
    const { companyId } = event

    // 管理员权限校验
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    const db = getDb()

    // 构建查询条件：不含已删除的；可按公司筛选
    let query = db.collection(COL.CASES).where({ deleted: false })
    if (companyId) {
      query = db.collection(COL.CASES).where({
        companyIds: db.command.all([companyId]),
        deleted: false,
      })
    }

    const { data: cases } = await query
      .orderBy('sort', 'asc')
      .orderBy('createdAt', 'desc')
      .get()

    const categoryIds = [...new Set(
      cases.flatMap((item) => Array.isArray(item.categoryIds) ? item.categoryIds : [])
    )]

    let categoryMap = new Map()
    if (categoryIds.length) {
      const { data: categoryDocs } = await db.collection(COL.CASE_CATEGORIES)
        .where({
          _id: db.command.in(categoryIds)
        })
        .get()

      categoryMap = new Map(
        categoryDocs.map((cat) => [cat._id, {
          categoryId: cat._id,
          name: cat.name,
          sort: cat.sort
        }])
      )
    }

    return success({
      list: cases.map(c => ({
        caseId: c._id,
        companyIds: c.companyIds || [],
        title: c.title,
        cover: c.cover,
        coverThumb: c.coverThumb || '',
        description: c.description,
        sort: c.sort,
        visible: c.visible,
        categoryIds: c.categoryIds || [],
        categories: (c.categoryIds || [])
          .map((id) => categoryMap.get(id))
          .filter(Boolean)
          .sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        createdAt: c.createdAt ? c.createdAt.getTime() : 0,
        updatedAt: c.updatedAt ? c.updatedAt.getTime() : 0,
      }))
    })
  } catch (err) {
    console.error('[adminGetCaseList] error:', err?.message || String(err))
    return fail(E0102)
  }
}
