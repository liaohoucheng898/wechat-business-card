const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0102 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { COL, getDb, normalizeStaffOpenids } = require('./_shared/db')
const { getPasswordStatus } = require('./_shared/password')

async function buildTempUrlMap(fileIDs) {
  const ids = [...new Set((fileIDs || []).filter((id) => id && id.startsWith('cloud://')))]
  if (!ids.length) return new Map()

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: ids })
    return new Map((fileList || []).map((item) => [item.fileID, item.tempFileURL || '']))
  } catch (error) {
    console.error('[adminGetStaffList] getTempFileURL failed:', error?.message || String(error))
    return new Map()
  }
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function normalizeEnumFilter(value, allowedValues = []) {
  const normalized = String(value || '').trim()
  return allowedValues.includes(normalized) ? normalized : ''
}

async function fetchStaffByStatus(db, status) {
  const batchSize = 100
  let skip = 0
  const rows = []

  while (true) {
    const { data } = await db.collection(COL.STAFF)
      .where({ status })
      .field({
        name: true,
        phone: true,
        secondPhone: true,
        showSecondPhone: true,
        wechat: true,
        email: true,
        bio: true,
        avatar: true,
        avatarOriginal: true,
        enabledCompanies: true,
        status: true,
        openid: true,
        openids: true,
        wechatBindings: true,
        isAdmin: true,
        passwordStatus: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(batchSize)
      .get()

    const batch = data || []
    rows.push(...batch)

    if (batch.length < batchSize) {
      break
    }

    skip += batchSize
  }

  return rows
}

function getStaffCreatedAtValue(staff) {
  return staff?.createdAt ? staff.createdAt.getTime() : 0
}

function sortStaffWithinStatus(list = []) {
  return [...list].sort((a, b) => {
    const aBound = normalizeStaffOpenids(a).length > 0 ? 1 : 0
    const bBound = normalizeStaffOpenids(b).length > 0 ? 1 : 0

    if (aBound !== bBound) {
      return bBound - aBound
    }

    return getStaffCreatedAtValue(b) - getStaffCreatedAtValue(a)
  })
}

function isKeywordMatched(staff, keyword) {
  if (!keyword) return true
  return [staff.name, staff.phone, staff.secondPhone].some((value) => String(value || '').includes(keyword))
}

function isBindingMatched(staff, bindingFilter) {
  if (!bindingFilter) return true
  const isBound = normalizeStaffOpenids(staff).length > 0
  return bindingFilter === 'bound' ? isBound : !isBound
}

function filterStaffRows(rows = [], { keyword, bindingFilter }) {
  return rows.filter((staff) => isKeywordMatched(staff, keyword) && isBindingMatched(staff, bindingFilter))
}

function getCompanyTitle(enabledCompanies = [], companyId) {
  const target = (enabledCompanies || []).find((item) => item.companyId === companyId)
  return target?.title || ''
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

const STAFF_LIST_COMPANY_IDS = {
  huayue: 'company_001',
  huabao: 'company_002',
  zhuochen: 'company_003',
}

exports.main = async (event = {}) => {
  const requestedPage = toPositiveInteger(event.page, 1)
  const requestedPageSize = Math.min(toPositiveInteger(event.pageSize, 20), 100)
  const keyword = String(event.keyword || '').trim()
  const statusFilter = normalizeEnumFilter(event.statusFilter, ['active', 'disabled'])
  const bindingFilter = normalizeEnumFilter(event.bindingFilter, ['bound', 'unbound'])

  try {
    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    const db = getDb()
    let candidateRows
    if (statusFilter) {
      candidateRows = sortStaffWithinStatus(await fetchStaffByStatus(db, statusFilter))
    } else {
      const activeRows = sortStaffWithinStatus(await fetchStaffByStatus(db, 'active'))
      const disabledRows = sortStaffWithinStatus(await fetchStaffByStatus(db, 'disabled'))
      candidateRows = activeRows.concat(disabledRows)
    }

    const filteredRows = filterStaffRows(candidateRows, { keyword, bindingFilter })
    const total = filteredRows.length
    const maxPage = total > 0 ? Math.ceil(total / requestedPageSize) : 1
    const page = Math.min(requestedPage, maxPage)
    const offset = (page - 1) * requestedPageSize
    const rows = filteredRows.slice(offset, offset + requestedPageSize)

    const avatarIds = rows.map((staff) => staff.avatar || staff.avatarOriginal || '').filter(Boolean)
    const avatarUrlMap = await buildTempUrlMap(avatarIds)

    const list = rows.map((staff) => {
      const avatarFileId = staff.avatar || staff.avatarOriginal || ''
      const boundOpenids = normalizeStaffOpenids(staff)
      const boundWechatBindings = normalizeWechatBindings(staff, boundOpenids)
      return {
        staffId: staff._id,
        name: staff.name,
        phone: staff.phone,
        secondPhone: staff.secondPhone || '',
        showSecondPhone: !!staff.showSecondPhone,
        wechat: staff.wechat || '',
        email: staff.email || '',
        bio: staff.bio || '',
        avatar: avatarUrlMap.get(avatarFileId) || avatarFileId || '',
        avatarOriginal: avatarFileId,
        enabledCompanies: staff.enabledCompanies || [],
        status: staff.status,
        isBound: boundOpenids.length > 0,
        boundWechatCount: boundOpenids.length,
        boundWechatOpenids: boundOpenids,
        boundWechatBindings,
        isAdmin: !!staff.isAdmin,
        huayueTitle: getCompanyTitle(staff.enabledCompanies, STAFF_LIST_COMPANY_IDS.huayue),
        huabaoTitle: getCompanyTitle(staff.enabledCompanies, STAFF_LIST_COMPANY_IDS.huabao),
        zhuochenTitle: getCompanyTitle(staff.enabledCompanies, STAFF_LIST_COMPANY_IDS.zhuochen),
        passwordStatus: getPasswordStatus(staff),
        mustChangePassword: !!staff.mustChangePassword,
        createdAt: staff.createdAt ? staff.createdAt.getTime() : null,
        updatedAt: staff.updatedAt ? staff.updatedAt.getTime() : 0,
      }
    })

    return success({
      list,
      page,
      pageSize: requestedPageSize,
      total,
    })
  } catch (error) {
    console.error('[adminGetStaffList] error:', error?.message || String(error))
    return fail(E0102)
  }
}
