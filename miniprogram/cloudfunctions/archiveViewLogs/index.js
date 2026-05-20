/**
 * archiveViewLogs — 定时归档访问日志
 * 触发：定时触发器，每天 00:05
 * 鉴权：系统触发，无需Token
 *
 * 逻辑：
 *   1. 查 view_logs 中超过6个月的记录
 *   2. 按 staffId + companyId + logType + date 分组聚合 count
 *   3. 写入 view_logs_daily
 *   4. 删除已归档的原始记录
 *   5. 分批处理（每批500条），避免云函数超时
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { COL, getDb } = require('./_shared/db')

const BATCH_SIZE = 500
const ARCHIVE_MONTHS = 6

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 获取归档截止日期（6个月前的今天 00:00:00）
 */
function getArchiveCutoff() {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - ARCHIVE_MONTHS)
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

exports.main = async (event, context) => {
  const db = getDb()
  const _ = db.command
  const cutoff = getArchiveCutoff()

  let totalArchived = 0
  let totalAggregated = 0
  let hasMore = true

  try {
    while (hasMore) {
      // 分批获取待归档记录
      const { data: logs } = await db.collection(COL.VIEW_LOGS)
        .where({ createdAt: _.lt(cutoff) })
        .limit(BATCH_SIZE)
        .get()

      if (!logs.length) {
        hasMore = false
        break
      }

      // 按 staffId + companyId + logType + date 聚合
      const aggregated = {}
      const idsToDelete = []

      for (const log of logs) {
        idsToDelete.push(log._id)
        const date = formatDate(new Date(log.createdAt))
        const key = `${log.staffId}|${log.companyId}|${log.logType}|${date}`

        if (!aggregated[key]) {
          aggregated[key] = {
            staffId: log.staffId,
            companyId: log.companyId,
            logType: log.logType,
            date,
            count: 0,
          }
        }
        aggregated[key].count++
      }

      // 写入 view_logs_daily（使用 update + upsert 避免重复）
      const aggEntries = Object.values(aggregated)
      for (const entry of aggEntries) {
        await db.collection(COL.VIEW_LOGS_DAILY)
          .where({
            staffId: entry.staffId,
            companyId: entry.companyId,
            logType: entry.logType,
            date: entry.date,
          })
          .update({
            data: {
              count: _.inc(entry.count),
            }
          })
          .then(async (res) => {
            // 如果没有匹配的记录（updated=0），则新增
            if (res.stats && res.stats.updated === 0) {
              await db.collection(COL.VIEW_LOGS_DAILY).add({
                data: { ...entry, createdAt: db.serverDate() }
              })
            }
          })
      }
      totalAggregated += aggEntries.length

      // 分批删除原始记录
      for (let i = 0; i < idsToDelete.length; i += 20) {
        const batch = idsToDelete.slice(i, i + 20)
        await db.collection(COL.VIEW_LOGS)
          .where({ _id: _.in(batch) })
          .remove()
      }
      totalArchived += idsToDelete.length

      // 如果本批不足 BATCH_SIZE，说明已处理完
      if (logs.length < BATCH_SIZE) {
        hasMore = false
      }
    }

    const summary = {
      archived: totalArchived,
      aggregated: totalAggregated,
      cutoff: cutoff.toISOString(),
    }
    return summary
  } catch (err) {
    console.error('[archiveViewLogs] error:', err?.message || String(err))
    return { error: err?.message || String(err), archived: totalArchived }
  }
}
