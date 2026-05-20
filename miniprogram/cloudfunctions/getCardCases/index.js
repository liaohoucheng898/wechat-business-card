/**
 * getCardCases - load paginated customer cases for the visitor card page.
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0302, E0401 } = require('./_shared/error-codes')
const { COL, getDb, getStaffById, getCompanyById } = require('./_shared/db')
const { checkRequired } = require('./_shared/validate')

const CASE_PAGE_SIZE = 8
const MAX_PAGE_SIZE = 8

async function resolveFileUrlMap(fileIDs = []) {
  const urlMap = new Map()
  const cloudFileIds = []

  ;(fileIDs || []).forEach((fileID) => {
    const id = String(fileID || '').trim()
    if (!id || urlMap.has(id)) return
    if (!id.startsWith('cloud://')) {
      urlMap.set(id, id)
      return
    }
    cloudFileIds.push(id)
  })

  if (!cloudFileIds.length) return urlMap

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: cloudFileIds })
    ;(fileList || []).forEach((item) => {
      urlMap.set(item.fileID, item.tempFileURL || '')
    })
  } catch (error) {
    console.error('[getCardCases] getTempFileURL batch failed:', error?.message || String(error))
  }

  return urlMap
}

function normalizePageValue(value, fallback, min, max) {
  const number = Math.floor(Number(value))
  const normalized = Number.isFinite(number) ? number : fallback
  return Math.min(Math.max(normalized, min), max)
}

function formatCases(cases = [], caseCoverUrlMap = new Map()) {
  return (cases || []).map((item) => {
    const coverFileId = item.coverThumb || item.cover || ''
    return {
      caseId: item._id,
      title: item.title,
      cover: caseCoverUrlMap.get(coverFileId) || '',
      description: item.description,
      categoryIds: item.categoryIds || [],
    }
  })
}

exports.main = async (event = {}) => {
  const { staffId, companyId, categoryId = '' } = event

  try {
    const { valid, missing } = checkRequired(event, ['staffId', 'companyId'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

    const safeOffset = normalizePageValue(event.offset, 0, 0, Number.MAX_SAFE_INTEGER)
    const safeLimit = normalizePageValue(event.limit, CASE_PAGE_SIZE, 1, MAX_PAGE_SIZE)
    const safeCategoryId = String(categoryId || '').trim()
    const db = getDb()
    const staff = await getStaffById(staffId)
    if (!staff) {
      return fail(E0302, '名片不存在')
    }

    const company = await getCompanyById(companyId)
    if (!company) {
      return fail(E0401, '名片不存在')
    }

    const companyEntry = (staff.enabledCompanies || []).find((item) => item.companyId === companyId)
    if (!companyEntry) {
      return fail(E0302, '名片不存在')
    }

    if (staff.status === 'disabled') {
      return success({
        cases: [],
        hasMoreCases: false,
        nextCaseOffset: safeOffset,
      })
    }

    const where = {
      companyIds: db.command.all([companyId]),
      deleted: false,
      visible: true,
    }

    if (safeCategoryId) {
      Object.assign(where, {
        categoryIds: db.command.all([safeCategoryId]),
      })
    }

    const { data: pageCases } = await db.collection(COL.CASES)
      .where(where)
      .orderBy('sort', 'asc')
      .skip(safeOffset)
      .limit(safeLimit + 1)
      .get()

    const visibleCases = (pageCases || []).slice(0, safeLimit)
    const hasMoreCases = (pageCases || []).length > safeLimit
    const caseCoverFileIds = visibleCases.map((item) => item.coverThumb || item.cover).filter(Boolean)
    const caseCoverUrlMap = await resolveFileUrlMap(caseCoverFileIds)

    return success({
      cases: formatCases(visibleCases, caseCoverUrlMap),
      hasMoreCases,
      nextCaseOffset: safeOffset + visibleCases.length,
    })
  } catch (error) {
    console.error('[getCardCases] error:', error?.message || String(error))
    return fail(E0102)
  }
}
