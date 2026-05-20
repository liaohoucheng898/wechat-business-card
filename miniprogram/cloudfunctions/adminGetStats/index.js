const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0102, E0603 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb } = require('./_shared/db')
const { isValidTimeRange } = require('./_shared/validate')

const BATCH_SIZE = 100

async function buildTempUrlMap(fileIDs) {
  const ids = [...new Set((fileIDs || []).filter((id) => id && id.startsWith('cloud://')))]
  if (!ids.length) return new Map()

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: ids })
    return new Map((fileList || []).map((item) => [item.fileID, item.tempFileURL || '']))
  } catch (error) {
    console.error('[adminGetStats] getTempFileURL failed:', error?.message || String(error))
    return new Map()
  }
}

function getDaysAgo(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

function getYesterdayRange() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  return { start: yesterday, end: today }
}

function getTimeRangeDays(timeRange) {
  switch (timeRange) {
    case 'week': return 7
    case 'half_month': return 15
    case 'month': return 30
    default: return 7
  }
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

function createRankingStat() {
  return {
    recentViews: 0,
    historyViews: 0,
    views7d: 0,
    views15d: 0,
    views30d: 0,
  }
}

exports.main = async (event) => {
  const { companyId, timeRange } = event

  try {
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!timeRange || !isValidTimeRange(timeRange)) {
      return fail(E0603)
    }

    const db = getDb()
    const days = getTimeRangeDays(timeRange)
    const periodStart = getDaysAgo(days)
    const start7d = getDaysAgo(7)
    const start15d = getDaysAgo(15)
    const start30d = getDaysAgo(30)
    const { start: yesterdayStart, end: yesterdayEnd } = getYesterdayRange()
    const companyFilter = companyId && companyId !== 'all' ? { companyId } : {}

    let activeStaff = await fetchAll((skip, limit) => db.collection(COL.STAFF)
      .where({ status: 'active' })
      .field({
        name: true,
        avatar: true,
        avatarOriginal: true,
        enabledCompanies: true,
      })
      .skip(skip)
      .limit(limit)
      .get()
      .then((res) => res.data || []))

    if (companyId && companyId !== 'all') {
      activeStaff = activeStaff.filter((staff) =>
        (staff.enabledCompanies || []).some((item) => item.companyId === companyId)
      )
    }

    const activeStaffIds = new Set(activeStaff.map((staff) => staff._id))
    const rankingStats = new Map(activeStaff.map((staff) => [staff._id, createRankingStat()]))

    const recentLogs = await fetchAll((skip, limit) => db.collection(COL.VIEW_LOGS)
      .where({
        ...companyFilter,
        logType: 'card_view',
      })
      .field({
        staffId: true,
        createdAt: true,
      })
      .skip(skip)
      .limit(limit)
      .get()
      .then((res) => res.data || []))

    const trendMap = {}
    for (let index = days - 1; index >= 0; index--) {
      const date = new Date()
      date.setDate(date.getDate() - index)
      trendMap[date.toISOString().slice(0, 10)] = 0
    }

    let periodTotal = 0
    let yesterdayTotal = 0
    let allTimeRecentTotal = 0

    recentLogs.forEach((log) => {
      const createdAt = new Date(log.createdAt)
      allTimeRecentTotal += 1

      if (createdAt >= periodStart) {
        periodTotal += 1
        const dateKey = createdAt.toISOString().slice(0, 10)
        if (trendMap[dateKey] !== undefined) {
          trendMap[dateKey] += 1
        }
      }

      if (createdAt >= yesterdayStart && createdAt < yesterdayEnd) {
        yesterdayTotal += 1
      }

      if (!activeStaffIds.has(log.staffId)) {
        return
      }

      const stat = rankingStats.get(log.staffId) || createRankingStat()
      stat.recentViews += 1
      if (createdAt >= start30d) stat.views30d += 1
      if (createdAt >= start15d) stat.views15d += 1
      if (createdAt >= start7d) stat.views7d += 1
      rankingStats.set(log.staffId, stat)
    })

    const dailyLogs = await fetchAll((skip, limit) => db.collection(COL.VIEW_LOGS_DAILY)
      .where({
        ...companyFilter,
        logType: 'card_view',
      })
      .field({
        staffId: true,
        count: true,
      })
      .skip(skip)
      .limit(limit)
      .get()
      .then((res) => res.data || []))

    let historyTotal = 0
    dailyLogs.forEach((record) => {
      const count = record.count || 0
      historyTotal += count

      if (!activeStaffIds.has(record.staffId)) {
        return
      }

      const stat = rankingStats.get(record.staffId) || createRankingStat()
      stat.historyViews += count
      rankingStats.set(record.staffId, stat)
    })

    const avatarIds = activeStaff.map((staff) => staff.avatar || staff.avatarOriginal || '').filter(Boolean)
    const avatarUrlMap = await buildTempUrlMap(avatarIds)

    const ranking = activeStaff.map((staff) => {
      const stat = rankingStats.get(staff._id) || createRankingStat()
      const avatarFileId = staff.avatar || staff.avatarOriginal || ''
      return {
        staffId: staff._id,
        name: staff.name,
        avatar: avatarUrlMap.get(avatarFileId) || avatarFileId || '',
        views7d: stat.views7d,
        views15d: stat.views15d,
        views30d: stat.views30d,
        viewsTotal: stat.recentViews + stat.historyViews,
      }
    }).sort((left, right) => right.views30d - left.views30d)

    const trend = Object.keys(trendMap)
      .sort()
      .map((date) => ({ date, count: trendMap[date] }))

    return success({
      periodTotal,
      allTimeTotal: allTimeRecentTotal + historyTotal,
      yesterdayTotal,
      trend,
      ranking,
    })
  } catch (error) {
    console.error('[adminGetStats] error:', error?.message || String(error))
    return fail(E0102)
  }
}
