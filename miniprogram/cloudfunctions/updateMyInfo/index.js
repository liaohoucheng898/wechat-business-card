/**
 * updateMyInfo - 员工编辑个人信息
 * 触发：编辑名片页保存
 * 鉴权：sessionToken
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0104, E0207, E0302 } = require('./_shared/error-codes')
const { COL, getDb, getStaffById } = require('./_shared/db')
const { verifyToken } = require('./_shared/auth')
const { isValidName, isValidEmail, isValidBio, isValidPhone, checkRequired } = require('./_shared/validate')

const ALLOWED_FIELDS = [
  'name',
  'wechat',
  'email',
  'bio',
  'avatar',
  'avatarOriginal',
  'enabledCompanies',
  'secondPhone',
  'showSecondPhone',
]

exports.main = async (event) => {
  const { sessionToken, staffId, pageLoadedAt, fields } = event

  try {
    const { valid, missing } = checkRequired(event, ['sessionToken', 'staffId', 'pageLoadedAt', 'fields'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    const authResult = await verifyToken(sessionToken)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (authResult.staffInfo._id !== staffId) {
      return fail(E0207, '只能编辑自己的信息')
    }

    if (fields.name !== undefined && !isValidName(fields.name)) {
      return fail(E0101, '姓名格式错误，1-20字，支持中英文数字')
    }
    if (fields.email !== undefined && !isValidEmail(fields.email)) {
      return fail(E0101, '邮箱格式错误')
    }
    if (fields.secondPhone !== undefined) {
      fields.secondPhone = String(fields.secondPhone || '').trim()
      if (fields.secondPhone && !isValidPhone(fields.secondPhone)) {
        return fail(E0101, '第二个手机号格式错误')
      }
    }
    if (fields.bio !== undefined && !isValidBio(fields.bio)) {
      return fail(E0101, '个人简介不能超过100字')
    }
    if (fields.showSecondPhone !== undefined && typeof fields.showSecondPhone !== 'boolean') {
      return fail(E0101, 'showSecondPhone 必须是布尔值')
    }

    const db = getDb()

    if (fields.avatar !== undefined && fields.avatarOriginal === undefined) {
      fields.avatarOriginal = fields.avatar
    }
    if (fields.avatarOriginal !== undefined && fields.avatar === undefined) {
      fields.avatar = fields.avatarOriginal
    }

    const currentStaff = await getStaffById(staffId)
    if (!currentStaff) {
      return fail(E0302)
    }

    if (fields.enabledCompanies !== undefined) {
      if (!Array.isArray(fields.enabledCompanies) || fields.enabledCompanies.length === 0) {
        return fail(E0101, '公司职位数据格式错误')
      }

      const currentEnabledCompanies = Array.isArray(currentStaff.enabledCompanies)
        ? currentStaff.enabledCompanies
        : []
      const currentCompanyMap = new Map(currentEnabledCompanies.map((item) => [item.companyId, item]))

      for (const item of fields.enabledCompanies) {
        if (!item || !item.companyId || !currentCompanyMap.has(item.companyId)) {
          return fail(E0101, '只能维护自己已开通公司的职位')
        }
      }

      fields.enabledCompanies = currentEnabledCompanies.map((item) => {
        const incoming = fields.enabledCompanies.find((ec) => ec.companyId === item.companyId)
        return {
          companyId: item.companyId,
          title: incoming && incoming.title !== undefined ? String(incoming.title).trim() : (item.title || ''),
        }
      })
    }

    const dbUpdatedAt = currentStaff.updatedAt
    if (dbUpdatedAt && dbUpdatedAt.getTime() > pageLoadedAt) {
      return fail(E0104)
    }

    if (fields.secondPhone !== undefined && !fields.secondPhone) {
      fields.showSecondPhone = false
    }
    if (fields.showSecondPhone !== undefined) {
      const effectiveSecondPhone = fields.secondPhone !== undefined ? fields.secondPhone : (currentStaff.secondPhone || '')
      fields.showSecondPhone = !!fields.showSecondPhone && !!effectiveSecondPhone
    }

    const updateData = {}
    for (const key of ALLOWED_FIELDS) {
      if (fields[key] !== undefined) {
        updateData[key] = fields[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return fail(E0101, '没有需要更新的字段')
    }

    updateData.updatedAt = db.serverDate()

    await db.collection(COL.STAFF).doc(staffId).update({
      data: updateData,
    })

    const updated = await getStaffById(staffId)

    return success({
      updatedAt: updated.updatedAt.getTime(),
    })
  } catch (error) {
    console.error('[updateMyInfo] error:', error?.message || String(error))
    return fail(E0102)
  }
}
