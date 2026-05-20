/**
 * writeViewLog — 写入访问日志
 * 触发：访客端触发统计事件
 * 鉴权：无
 * 
 * 防抖策略：同一 staffId + companyId + logType 10分钟内不重复记录
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102 } = require('./_shared/error-codes')
const { COL, getDb, getStaffById, getStaffByOpenid } = require('./_shared/db')
const { checkRequired, isValidLogType, isValidShareScene } = require('./_shared/validate')

const DEBOUNCE_MS = 10 * 60 * 1000 // 10分钟防抖

exports.main = async (event, context) => {
  const { staffId, companyId, logType, caseId, shareScene } = event

  try {
    // 参数校验
    const { valid, missing } = checkRequired(event, ['staffId', 'companyId', 'logType'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    if (!isValidLogType(logType)) {
      return fail(E0101, 'logType 无效')
    }

    // case_click 必须有 caseId
    if (logType === 'case_click' && !caseId) {
      return fail(E0101, 'case_click 类型必须提供 caseId')
    }

    const validScene = isValidShareScene(shareScene) ? shareScene : 'other'

    const db = getDb()
    const _ = db.command
    const { OPENID } = cloud.getWXContext()
    const targetStaff = await getStaffById(staffId)

    if (!targetStaff || targetStaff.status === 'disabled') {
      return success(null)
    }

    const hasCompanyAccess = (targetStaff.enabledCompanies || []).some((item) => item.companyId === companyId)
    if (!hasCompanyAccess) {
      return success(null)
    }

    if (OPENID) {
      const viewerStaff = await getStaffByOpenid(OPENID)
      if (viewerStaff) {
        return success(null)
      }
    }

    // 防抖检查：同一 openid + staffId + companyId + logType 10分钟内不重复记录
    if (OPENID) {
      const debounceTime = new Date(Date.now() - DEBOUNCE_MS)
      const { data: recentLogs } = await db.collection(COL.VIEW_LOGS)
        .where({
          staffId,
          companyId,
          logType,
          visitorOpenid: OPENID,
          createdAt: _.gte(debounceTime),
        })
        .limit(1)
        .get()

      if (recentLogs.length > 0) {
        // 防抖命中，静默返回成功（不写入）
        return success(null)
      }
    }

    // 写入日志
    await db.collection(COL.VIEW_LOGS).add({
      data: {
        staffId,
        companyId,
        logType,
        caseId: caseId || null,
        shareScene: validScene,
        visitorOpenid: OPENID || '',
        createdAt: db.serverDate(),
      },
    })

    return success(null)
  } catch (e) {
    console.error('[writeViewLog] error:', e?.message || String(e))
    return fail(E0102)
  }
}
