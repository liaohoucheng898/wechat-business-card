/**
 * getMyStats - 员工个人统计数据
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0207, E0603 } = require('./_shared/error-codes')
const { COL, getDb } = require('./_shared/db')
const { verifyToken } = require('./_shared/auth')
const { checkRequired, isValidTimeRange } = require('./_shared/validate')

const BATCH_SIZE = 100

function getStartDate(timeRange) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (timeRange) {
    case 'week':
      return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'half_month':
      return new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000)
    case 'month':
      return new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
}

function getDayCount(timeRange) {
  switch (timeRange) {
    case 'week': return 7
    case 'half_month': return 15
    case 'month': return 30
    default: return 7
  }
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function fetchAll(loadPage) {
  const list = []
  let offset = 0
  while (true) {
    const page = await loadPage(offset, BATCH_SIZE)
    list.push(...page)
    if (page.length < BATCH_SIZE) break
    offset += BATCH_SIZE
  }
  return list
}

exports.main = async (event) => {
  const { sessionToken, staffId, companyId, timeRange } = event

  try {
    const { valid, missing } = checkRequired(event, ['sessionToken', 'staffId', 'companyId', 'timeRange'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    if (!isValidTimeRange(timeRange)) {
      return fail(E0603)
    }

    const authResult = await verifyToken(sessionToken)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (authResult.staffInfo._id !== staffId) {
      return fail(E0207, '只能查看自己的统计数据')
    }

    const db = getDb()
    const startDate = getStartDate(timeRange)
    const dayCount = getDayCount(timeRange)

    const baseWhere = { staffId, logType: 'card_view' }
    if (companyId !== 'all') {
      baseWhere.companyId = companyId
    }

    const recentLogs = await fetchAll((skip, limit) => db.collection(COL.VIEW_LOGS)
      .where(baseWhere)
      .field({ createdAt: true })
      .skip(skip)
      .limit(limit)
      .get()
      .then((res) => res.data || []))

    let periodTotal = 0
    const countByDate = {}
    recentLogs.forEach((log) => {
      const createdAt = new Date(log.createdAt)
      if (createdAt < startDate) {
        return
      }
      periodTotal += 1
      const dateKey = formatDate(createdAt)
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1
    })

    const dailyWhere = { staffId, logType: 'card_view' }
    if (companyId !== 'all') {
      dailyWhere.companyId = companyId
    }

    const dailyRecords = await fetchAll((skip, limit) => db.collection(COL.VIEW_LOGS_DAILY)
      .where(dailyWhere)
      .field({ count: true })
      .skip(skip)
      .limit(limit)
      .get()
      .then((res) => res.data || []))

    let dailyTotal = 0
    dailyRecords.forEach((record) => {
      dailyTotal += record.count || 0
    })

    const trend = []
    for (let index = dayCount - 1; index >= 0; index--) {
      const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000)
      const dateKey = formatDate(date)
      trend.push({ date: dateKey, count: countByDate[dateKey] || 0 })
    }

    const allTimeTotal = recentLogs.length + dailyTotal
    return success({
      periodTotal,
      allTimeTotal,
      trend,
    })
  } catch (error) {
    console.error('[getMyStats] error:', error?.message || String(error))
    return fail(E0102)
  }
}
