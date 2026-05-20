const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const COL = {
  STAFF: 'staff',
  ADMIN_CONFIG: 'admin_config',
}

const E0101 = { code: 'E0101', msg: '参数缺失或格式错误' }
const E0102 = { code: 'E0102', msg: '服务器内部错误' }
const E0207 = { code: 'E0207', msg: '登录已过期，请重新登录' }
const E0208 = { code: 'E0208', msg: '无管理员权限' }
const E0211 = { code: 'E0211', msg: '账号已停用，请联系管理员' }
const E0302 = { code: 'E0302', msg: '员工不存在' }

function success(data = null, msg = 'ok') {
  return { code: 0, data, msg }
}

function fail(errorDef, customMsg) {
  return {
    code: errorDef.code,
    data: null,
    msg: customMsg || errorDef.msg,
  }
}

function getDb() {
  return cloud.database()
}

async function getStaffById(staffId) {
  const db = getDb()
  try {
    const { data } = await db.collection(COL.STAFF).doc(staffId).get()
    return data
  } catch (error) {
    if (error.errCode === -1) {
      return null
    }
    throw error
  }
}

async function getAdminConfig() {
  const db = getDb()
  try {
    const { data } = await db.collection(COL.ADMIN_CONFIG).doc('admin_config').get()
    return data
  } catch (error) {
    if (error.errCode === -1) {
      return null
    }
    throw error
  }
}

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

function normalizeWechatBindings(staff = {}, boundOpenids = normalizeStaffOpenids(staff)) {
  const remarkMap = new Map()

  if (Array.isArray(staff.wechatBindings)) {
    staff.wechatBindings.forEach((item) => {
      const openid = String(item?.openid || '').trim()
      if (openid) {
        remarkMap.set(openid, String(item?.remark || '').trim())
      }
    })
  }

  return boundOpenids.map((openid) => ({
    openid,
    remark: remarkMap.get(openid) || '',
  }))
}

async function verifyAdminByStaffId(staffId) {
  if (!staffId) {
    return { error: E0207 }
  }

  const staff = await getStaffById(staffId)
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
  if (!adminConfig || !Array.isArray(adminConfig.adminPhones) || !adminConfig.adminPhones.includes(staff.phone)) {
    return { error: E0208 }
  }

  return { staffInfo: staff }
}

exports.main = async (event) => {
  try {
    const { staffId, targetOpenid } = event || {}
    const normalizedTargetOpenid = String(targetOpenid || '').trim()

    const { customUserId: operatorId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(operatorId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!staffId || !normalizedTargetOpenid) {
      return fail(E0101, '缺少解绑所需参数')
    }

    const staff = await getStaffById(staffId)
    if (!staff) {
      return fail(E0302)
    }

    const currentOpenids = normalizeStaffOpenids(staff)
    if (!currentOpenids.includes(normalizedTargetOpenid)) {
      const currentBindings = normalizeWechatBindings(staff, currentOpenids)
      return success({
        boundWechatCount: currentOpenids.length,
        boundWechatOpenids: currentOpenids,
        boundWechatBindings: currentBindings,
      })
    }

    const nextOpenids = currentOpenids.filter((item) => item !== normalizedTargetOpenid)
    const nextPrimaryOpenid = nextOpenids[0] || ''
    const nextWechatBindings = normalizeWechatBindings(staff, nextOpenids)
    const db = getDb()

    await db.collection(COL.STAFF).doc(staffId).update({
      data: {
        openids: nextOpenids,
        openid: nextPrimaryOpenid,
        wechatBindings: nextWechatBindings,
        updatedAt: db.serverDate(),
      },
    })

    if (staff.isAdmin) {
      const adminConfig = await getAdminConfig()
      if (adminConfig) {
        const adminOpenids = Array.isArray(adminConfig.adminOpenids) ? adminConfig.adminOpenids : []
        const nextAdminOpenids = adminOpenids.filter((item) => item !== normalizedTargetOpenid)

        await db.collection(COL.ADMIN_CONFIG).doc('admin_config').update({
          data: {
            adminOpenids: nextAdminOpenids,
            updatedAt: db.serverDate(),
          },
        })
      }
    }

    return success({
      boundWechatCount: nextOpenids.length,
      boundWechatOpenids: nextOpenids,
      boundWechatBindings: nextWechatBindings,
    })
  } catch (error) {
    console.error('[adminUnbindWechat] error:', error?.message || String(error))
    return fail(E0102)
  }
}
