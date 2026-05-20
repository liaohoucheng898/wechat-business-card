/**
 * 数据库集合名常量 + 公共查询
 */
const cloud = require('wx-server-sdk')

// 集合名常量
const COL = {
  STAFF: 'staff',
  COMPANIES: 'companies',
  CASES: 'cases',
  CASE_CATEGORIES: 'case_categories',
  VIEW_LOGS: 'view_logs',
  VIEW_LOGS_DAILY: 'view_logs_daily',
  ADMIN_CONFIG: 'admin_config',
  SMS_CODES: 'sms_codes',
}

/**
 * 获取数据库实例
 */
function getDb() {
  return cloud.database()
}

/**
 * 获取员工信息（by staffId）
 * @param {string} staffId
 * @returns {object|null} staff 记录
 */
async function getStaffById(staffId) {
  const db = getDb()
  try {
    const { data } = await db.collection(COL.STAFF).doc(staffId).get()
    return data
  } catch (e) {
    if (e.errCode === -1) return null
    throw e
  }
}

/**
 * 获取员工信息（by openid）
 * @param {string} openid
 * @returns {object|null}
 */
async function getStaffByOpenid(openid) {
  const db = getDb()
  const _ = db.command
  const openidValue = String(openid || '').trim()
  if (!openidValue) {
    return null
  }

  const { data: byOpenids } = await db.collection(COL.STAFF)
    .where({
      openids: _.all([openidValue]),
    })
    .limit(1)
    .get()

  if (byOpenids[0]) {
    return byOpenids[0]
  }

  const { data: byOpenid } = await db.collection(COL.STAFF)
    .where({ openid: openidValue })
    .limit(1)
    .get()

  return byOpenid[0] || null
}

/**
 * 统一获取员工已绑定的微信 openid 列表
 * @param {object} staff
 * @returns {string[]}
 */
function normalizeStaffOpenids(staff = {}) {
  const openids = []

  if (staff.openid) {
    openids.push(String(staff.openid).trim())
  }

  if (Array.isArray(staff.openids)) {
    staff.openids.forEach((item) => {
      const value = String(item || '').trim()
      if (value) {
        openids.push(value)
      }
    })
  }

  return Array.from(new Set(openids.filter(Boolean)))
}

/**
 * 获取员工信息（by phone）
 * @param {string} phone
 * @returns {object|null}
 */
async function getStaffByPhone(phone) {
  const db = getDb()
  const { data } = await db.collection(COL.STAFF)
    .where({ phone })
    .limit(1)
    .get()
  return data[0] || null
}

/**
 * 获取公司信息
 * @param {string} companyId
 * @returns {object|null}
 */
async function getCompanyById(companyId) {
  const db = getDb()
  try {
    const { data } = await db.collection(COL.COMPANIES).doc(companyId).get()
    return data
  } catch (e) {
    if (e.errCode === -1) return null
    throw e
  }
}

/**
 * 获取 admin_config
 * @returns {object|null}
 */
async function getAdminConfig() {
  const db = getDb()
  try {
    const { data } = await db.collection(COL.ADMIN_CONFIG).doc('admin_config').get()
    return data
  } catch (e) {
    if (e.errCode === -1) return null
    throw e
  }
}

module.exports = {
  COL,
  getDb,
  getStaffById,
  getStaffByOpenid,
  normalizeStaffOpenids,
  getStaffByPhone,
  getCompanyById,
  getAdminConfig,
}
