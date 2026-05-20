/**
 * getCardInfo - 获取名片信息
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0302, E0401 } = require('./_shared/error-codes')
const { COL, getDb, getStaffById, getCompanyById } = require('./_shared/db')
const { checkRequired } = require('./_shared/validate')
const { resolveRichTextUrls } = require('./_shared/richtext')

const CASE_PAGE_SIZE = 8

function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

function buildPhoneDisplay(phone = '', secondPhone = '', showSecondPhone = false) {
  const primary = String(phone || '').trim()
  const secondary = String(secondPhone || '').trim()
  if (!primary) return ''
  if (showSecondPhone && secondary) {
    return `${primary} / ${secondary}`
  }
  return primary
}

async function resolveFileUrl(fileID) {
  if (!fileID) return ''
  if (!fileID.startsWith('cloud://')) return fileID

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] })
    return (fileList && fileList[0] && fileList[0].tempFileURL) || ''
  } catch (error) {
    console.error('[getCardInfo] getTempFileURL failed:', error?.message || String(error))
    return ''
  }
}

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
    console.error('[getCardInfo] getTempFileURL batch failed:', error?.message || String(error))
  }

  return urlMap
}

exports.main = async (event) => {
  const { staffId, companyId } = event

  try {
    const { valid, missing } = checkRequired(event, ['staffId', 'companyId'])
    if (!valid) {
      return fail(E0101, `缺少参数: ${missing}`)
    }

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
        disabled: true,
        companyPhone: company.phone,
        companyName: company.name,
      })
    }

    const title = companyEntry.title || ''

    const { data: cases } = await db.collection(COL.CASES)
      .where({
        companyIds: db.command.all([companyId]),
        deleted: false,
        visible: true,
      })
      .orderBy('sort', 'asc')
      .limit(CASE_PAGE_SIZE + 1)
      .get()

    const { data: caseCategories } = await db.collection(COL.CASE_CATEGORIES)
      .where({ companyId })
      .orderBy('sort', 'asc')
      .get()

    const avatarFileId = staff.avatar || staff.avatarOriginal || ''
    const visibleCases = (cases || []).slice(0, CASE_PAGE_SIZE)
    const hasMoreCases = (cases || []).length > CASE_PAGE_SIZE
    const caseCoverFileIds = visibleCases.map((item) => item.coverThumb || item.cover).filter(Boolean)
    const caseCoverUrlMap = await resolveFileUrlMap(caseCoverFileIds)
    const formattedCases = visibleCases.map((item) => {
      const coverFileId = item.coverThumb || item.cover || ''
      return {
        caseId: item._id,
        title: item.title,
        cover: caseCoverUrlMap.get(coverFileId) || '',
        description: item.description,
        categoryIds: item.categoryIds || [],
      }
    })

    return success({
      disabled: false,
      staff: {
        name: staff.name,
        phone: maskPhone(staff.phone),
        phoneFull: staff.phone,
        secondPhone: staff.secondPhone || '',
        showSecondPhone: !!staff.showSecondPhone,
        phoneDisplay: buildPhoneDisplay(staff.phone, staff.secondPhone || '', !!staff.showSecondPhone),
        wechat: staff.wechat || '',
        email: staff.email || '',
        bio: staff.bio || '',
        avatar: await resolveFileUrl(avatarFileId),
        title,
      },
      company: {
        name: company.name,
        logo: company.logo,
        intro: await resolveRichTextUrls(cloud, company.intro || ''),
        businessIntro: await resolveRichTextUrls(cloud, company.businessIntro || ''),
        address: company.address,
        phone: company.phone,
        latitude: company.latitude,
        longitude: company.longitude,
        locationName: company.locationName,
        website: company.website || '',
      },
      cases: formattedCases,
      hasMoreCases,
      nextCaseOffset: formattedCases.length,
      caseCategories: (caseCategories || []).map((category) => ({
        _id: category._id,
        name: category.name,
        sort: category.sort,
      })),
    })
  } catch (error) {
    console.error('[getCardInfo] error:', error?.message || String(error))
    return fail(E0102)
  }
}
