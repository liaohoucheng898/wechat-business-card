const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// PC端鉴权：通过 @cloudbase/node-sdk 取 Custom Login 的 customUserId（即 staffId）
const tcb = require('@cloudbase/node-sdk')
const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()


const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0601_CATEGORY, E0602 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')

exports.main = async (event) => {
  try {
    const { action, companyId, name, sort, categoryId } = event

    // 管理员权限校验
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!companyId) {
      return fail(E0101, '缺少 companyId')
    }
    if (!['list', 'create', 'update', 'delete'].includes(action)) {
      return fail(E0101, 'action 必须为 list/create/update/delete')
    }

    const db = getDb()
    const _ = db.command

    // === list ===
    if (action === 'list') {
      const { data: categories } = await db.collection(COL.CASE_CATEGORIES)
        .where({ companyId })
        .orderBy('sort', 'asc')
        .get()

      // 统计每个栏目关联的案例数
      const categoriesWithCount = await Promise.all(
        categories.map(async (cat) => {
          const { total } = await db.collection(COL.CASES)
            .where({
              categoryIds: cat._id,
              deleted: false,
            })
            .count()
          return {
            _id: cat._id,
            name: cat.name,
            sort: cat.sort,
            caseCount: total,
          }
        })
      )

      return success({ categories: categoriesWithCount })
    }

    // === create ===
    if (action === 'create') {
      if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 10) {
        return fail(E0101, '栏目名称1-10字符')
      }

      // 校验同公司内名称唯一
      const { total: dupCount } = await db.collection(COL.CASE_CATEGORIES)
        .where({ companyId, name: name.trim() })
        .count()
      if (dupCount > 0) {
        return fail(E0601_CATEGORY)
      }

      const { _id } = await db.collection(COL.CASE_CATEGORIES).add({
        data: {
          companyId,
          name: name.trim(),
          sort: typeof sort === 'number' ? sort : 100,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })

      return success({
        category: { _id, name: name.trim(), sort: typeof sort === 'number' ? sort : 100 },
      })
    }

    // === update ===
    if (action === 'update') {
      if (!categoryId) {
        return fail(E0101, '缺少 categoryId')
      }

      // 查栏目是否存在
      let cat
      try {
        const { data } = await db.collection(COL.CASE_CATEGORIES).doc(categoryId).get()
        cat = data
      } catch (e) {
        return fail(E0602)
      }
      if (!cat) {
        return fail(E0602)
      }

      const updateData = { updatedAt: db.serverDate() }

      if (name !== undefined) {
        if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 10) {
          return fail(E0101, '栏目名称1-10字符')
        }
        // 校验名称唯一（排除自身）
        const { total: dupCount } = await db.collection(COL.CASE_CATEGORIES)
          .where({
            companyId,
            name: name.trim(),
            _id: _.neq(categoryId),
          })
          .count()
        if (dupCount > 0) {
          return fail(E0601_CATEGORY)
        }
        updateData.name = name.trim()
      }

      if (sort !== undefined && typeof sort === 'number') {
        updateData.sort = sort
      }

      await db.collection(COL.CASE_CATEGORIES).doc(categoryId).update({ data: updateData })

      const { data: updated } = await db.collection(COL.CASE_CATEGORIES).doc(categoryId).get()
      return success({
        category: { _id: updated._id, name: updated.name, sort: updated.sort },
      })
    }

    // === delete ===
    if (action === 'delete') {
      if (!categoryId) {
        return fail(E0101, '缺少 categoryId')
      }

      // 查栏目是否存在
      let cat
      try {
        const { data } = await db.collection(COL.CASE_CATEGORIES).doc(categoryId).get()
        cat = data
      } catch (e) {
        return fail(E0602)
      }
      if (!cat) {
        return fail(E0602)
      }

      // 删除栏目
      await db.collection(COL.CASE_CATEGORIES).doc(categoryId).remove()

      // 清除所有 cases 中 categoryIds 里的该栏目ID
      // 云开发 where+update 单次最多更新20条，需循环处理
      while (true) {
        const { data: affectedCases } = await db.collection(COL.CASES)
          .where({
            categoryIds: categoryId,
            deleted: false,
          })
          .limit(20)
          .get()

        if (affectedCases.length === 0) break

        for (const c of affectedCases) {
          const newCategoryIds = (c.categoryIds || []).filter((id) => id !== categoryId)
          await db.collection(COL.CASES).doc(c._id).update({
            data: { categoryIds: newCategoryIds, updatedAt: db.serverDate() },
          })
        }
      }

      return success(null)
    }
  } catch (err) {
    console.error('[adminManageCategory] error:', err?.message || String(err))
    return fail(E0102)
  }
}
