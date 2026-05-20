/**
 * Token 校验 + 管理员权限校验
 *
 * verifyToken      — 小程序端，校验 sessionToken（wx-server-sdk）
 * verifyAdminToken — 兼容旧的 pcSessionToken / sessionToken 方式（保留备用）
 */
const cloud = require('wx-server-sdk')
const { COL, getDb, getAdminConfig } = require('./db')
const { E0207, E0208, E0211 } = require('./error-codes')

/**
 * 普通员工 Token 校验（小程序端）
 */
async function verifyToken(sessionToken) {
  if (!sessionToken) {
    return { error: E0207 }
  }

  const db = getDb()
  const now = Date.now()

  const { data: list } = await db.collection(COL.STAFF)
    .where({ sessionToken })
    .limit(1)
    .get()

  if (!list.length) {
    return { error: E0207 }
  }

  const staff = list[0]

  if (!staff.sessionExpireAt || staff.sessionExpireAt.getTime() < now) {
    return { error: E0207 }
  }

  if (staff.status !== 'active') {
    return { error: E0211 }
  }

  return { staffInfo: staff }
}

/**
 * 管理员身份校验（PC Web 端 — Custom Login 方式）
 *
 * 通过 staffId 直接查 staff 表验权。
 * staffId 由调用方（admin 云函数）从 @cloudbase/node-sdk auth.getUserInfo() 取得后传入。
 *
 * @param {string} staffId
 * @returns {{ staffInfo: object } | { error: object }}
 */
async function verifyAdminByStaffId(staffId) {
  if (!staffId) {
    return { error: E0207 }
  }

  const db = getDb()

  let staff
  try {
    const res = await db.collection(COL.STAFF).doc(staffId).get()
    staff = res.data
  } catch (e) {
    return { error: E0207 }
  }

  if (!staff) {
    return { error: E0207 }
  }

  if (staff.status !== 'active') {
    return { error: E0211 }
  }

  if (!staff.isAdmin) {
    return { error: E0208 }
  }

  const adminConfig = await getAdminConfig()
  if (!adminConfig || !adminConfig.adminPhones.includes(staff.phone)) {
    return { error: E0208 }
  }

  return { staffInfo: staff }
}

module.exports = { verifyToken, verifyAdminByStaffId }
