/**
 * login - 小程序启动登录
 * 触发：小程序启动时
 * 鉴权：无，openid 由云函数自动获取
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const crypto = require('crypto')
const { success, fail } = require('./_shared/response')
const { E0102, E0211 } = require('./_shared/error-codes')
const { COL, getDb, getStaffByOpenid, normalizeStaffOpenids } = require('./_shared/db')
const { getPasswordStatus } = require('./_shared/password')

async function resolveFileUrl(fileID) {
  if (!fileID) return ''
  if (!fileID.startsWith('cloud://')) return fileID

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] })
    return (fileList && fileList[0] && fileList[0].tempFileURL) || ''
  } catch (error) {
    console.error('[login] getTempFileURL failed:', error?.message || String(error))
    return ''
  }
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

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const staff = await getStaffByOpenid(OPENID)
    if (!staff) {
      return success({ needBind: true })
    }

    if (staff.status === 'disabled') {
      return fail(E0211)
    }

    const sessionToken = crypto.randomBytes(16).toString('hex')
    const sessionExpireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const db = getDb()
    const boundOpenids = normalizeStaffOpenids(staff)
    if (OPENID && !boundOpenids.includes(OPENID)) {
      boundOpenids.push(OPENID)
    }

    const updateData = {
      sessionToken,
      sessionExpireAt,
      openids: boundOpenids,
      wechatBindings: normalizeWechatBindings(staff, boundOpenids),
      updatedAt: db.serverDate(),
    }

    if (!staff.openid && OPENID) {
      updateData.openid = OPENID
    }

    await db.collection(COL.STAFF).doc(staff._id).update({
      data: updateData,
    })

    const avatarFileId = staff.avatar || staff.avatarOriginal || ''
    const passwordStatus = getPasswordStatus(staff)
    const mustChangePassword = passwordStatus === 'temporary'
    const staffInfo = {
      staffId: staff._id,
      name: staff.name,
      phone: staff.phone,
      secondPhone: staff.secondPhone || '',
      showSecondPhone: !!staff.showSecondPhone,
      wechat: staff.wechat || '',
      email: staff.email || '',
      bio: staff.bio || '',
      avatar: await resolveFileUrl(avatarFileId),
      avatarOriginal: avatarFileId,
      enabledCompanies: staff.enabledCompanies || [],
      isAdmin: !!staff.isAdmin,
      passwordStatus,
      mustChangePassword,
    }

    return success({
      needBind: false,
      staffInfo,
      sessionToken,
      sessionExpireAt: sessionExpireAt.getTime(),
      passwordStatus,
      mustChangePassword,
    })
  } catch (error) {
    console.error('[login] error:', error?.message || String(error))
    return fail(E0102)
  }
}
