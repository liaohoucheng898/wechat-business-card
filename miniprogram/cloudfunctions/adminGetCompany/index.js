/**
 * adminGetCompany - 获取单个公司详情
 */
const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tcbApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const tcbAuth = tcbApp.auth()

const { success, fail } = require('./_shared/response')
const { E0101, E0102, E0401 } = require('./_shared/error-codes')
const { verifyAdminByStaffId } = require('./_shared/auth')
const { getCompanyById } = require('./_shared/db')
const { sanitizeRichText } = require('./_shared/richtext')

exports.main = async (event) => {
  try {
    const { companyId } = event

    const { customUserId: staffId } = tcbAuth.getUserInfo()
    const authResult = await verifyAdminByStaffId(staffId)
    if (authResult.error) {
      return fail(authResult.error)
    }

    if (!companyId) {
      return fail(E0101, '缺少 companyId')
    }

    const company = await getCompanyById(companyId)
    if (!company) {
      return fail(E0401)
    }

    return success({
      companyId: company._id,
      name: company.name,
      logo: company.logo || '',
      intro: sanitizeRichText(company.intro || ''),
      businessIntro: sanitizeRichText(company.businessIntro || ''),
      address: company.address || '',
      phone: company.phone || '',
      latitude: company.latitude || 0,
      longitude: company.longitude || 0,
      locationName: company.locationName || '',
      website: company.website || '',
      updatedAt: company.updatedAt ? company.updatedAt.getTime() : 0,
    })
  } catch (error) {
    console.error('[adminGetCompany] error:', error?.message || String(error))
    return fail(E0102)
  }
}
