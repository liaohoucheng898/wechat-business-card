const { callCloud } = require('../../utils/cloud')
const { showToast, showSuccess, showError } = require('../../utils/toast')
const config = require('../../config/env')

const FIXED_SHARE_TITLE = '有幸相识，愿您乘风破浪'
const CARD_TOP_ADDRESS_MAP = {
  '海南省海口市海秀中路71号海垦广场B座11楼1105': '海南省海口市海秀中路71号海垦广场B座11楼'
}
const SAVE_CONTACT_HEIGHT_DELTA_RPX = 3
const SHARE_ENTRY_SCENES = [1007, 1008, 1044, 1154]
const CASE_PAGE_SIZE = 8

function formatTopCardAddress(address = '') {
  return CARD_TOP_ADDRESS_MAP[address] || address
}

function decorateCases(cases = []) {
  return cases.map((item) => ({
    ...item,
    badgeText: (item.title || '案例').replace(/\s+/g, '').slice(0, 2) || '案例'
  }))
}

function normalizePhone(phone = '') {
  return String(phone || '').replace(/[^\d+]/g, '')
}

function normalizeWebsite(url = '') {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) {
    return value
  }
  return `https://${value}`
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

function buildCapsuleStyle() {
  try {
    const capsuleRect = wx.getMenuButtonBoundingClientRect()
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const windowWidth = windowInfo.windowWidth || 375

    if (!capsuleRect || !capsuleRect.width || !capsuleRect.height) {
      return null
    }

    const left = Math.max(windowWidth - capsuleRect.right, 12)
    const deltaPx = (windowWidth / 750) * SAVE_CONTACT_HEIGHT_DELTA_RPX
    const buttonHeight = Math.max(capsuleRect.height - deltaPx, 24)
    const fontSize = Math.max(Math.round(capsuleRect.height * 0.36), 12)
    const wrapStyle = [
      `top:${capsuleRect.top}px`,
      `left:${left}px`,
      `width:${capsuleRect.width}px`,
      `height:${capsuleRect.height}px`
    ].join(';')
    const buttonStyle = [
      `height:${buttonHeight}px`,
      `line-height:${buttonHeight}px`,
      `font-size:${fontSize}px`
    ].join(';')

    return { wrapStyle, buttonStyle }
  } catch (error) {
    return null
  }
}

Page({
  data: {
    loading: true,
    notFound: false,
    notFoundText: '名片不存在',
    staffId: '',
    companyId: '',
    staff: null,
    company: null,
    cases: [],
    caseCategories: [],
    filteredCases: [],
    activeCategoryId: '',
    casesLoadingMore: false,
    hasMoreCases: false,
    nextCaseOffset: 0,
    defaultAvatar: config.defaultAvatar,
    saveContactWrapStyle: 'top:24px;left:16px;width:96px;height:32px',
    saveContactButtonStyle: 'height:29.5px;line-height:29.5px;font-size:12px'
  },

  onLoad(options) {
    const { staffId, companyId } = options
    this._syncCapsuleButton()
    if (this._redirectSelfCardToMyCard(staffId)) {
      return
    }
    if (!staffId || !companyId) {
      const auth = require('../../utils/auth')
      if (auth.isLoggedIn()) {
        wx.redirectTo({ url: '/pages/my-card/index' })
      } else {
        this.setData({
          loading: false,
          notFound: true,
          notFoundText: '名片不存在'
        })
      }
      return
    }

    this.setData({
      staffId,
      companyId,
      loading: true,
      notFound: false,
      notFoundText: '名片不存在',
      cases: [],
      caseCategories: [],
      filteredCases: [],
      activeCategoryId: '',
      casesLoadingMore: false,
      hasMoreCases: false,
      nextCaseOffset: 0
    })
    this.loadCardInfo()
  },

  onShow() {
    this._syncCapsuleButton()
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      this._enterScene = currentPage && currentPage.options && currentPage.options.scene
    } catch (e) {}
    if (this._redirectSelfCardToMyCard(this.data.staffId)) {
      return
    }
  },

  _redirectSelfCardToMyCard(staffId) {
    if (!staffId) return false

    const auth = require('../../utils/auth')
    const staffInfo = auth.getStaffInfo()
    if (!staffInfo || staffInfo.staffId !== staffId) {
      return false
    }

    const app = getApp()
    const enterOptions = app.globalData.enterOptions || {}
    const isShareEntryScene = SHARE_ENTRY_SCENES.includes(Number(enterOptions.scene))
    if (isShareEntryScene) {
      return false
    }

    wx.redirectTo({ url: '/pages/my-card/index' })
    return true
  },

  _syncCapsuleButton() {
    const style = buildCapsuleStyle()
    if (!style) {
      return
    }

    this.setData({
      saveContactWrapStyle: style.wrapStyle,
      saveContactButtonStyle: style.buttonStyle
    })
  },

  onShareAppMessage() {
    const { staffId, companyId } = this.data

    return {
      title: FIXED_SHARE_TITLE,
      path: `/pages/card/index?staffId=${staffId}&companyId=${companyId}`
    }
  },

  onReachBottom() {
    this.loadMoreCases()
  },

  loadCardInfo() {
    const { staffId, companyId } = this.data

    callCloud('getCardInfo', { staffId, companyId }, {
      showLoading: false,
      silent: true
    }).then((data) => {
      if (data.disabled) {
        wx.redirectTo({
          url: `/pages/card-disabled/index?companyPhone=${encodeURIComponent(data.companyPhone || '')}&companyName=${encodeURIComponent(data.companyName || '')}`
        })
        return
      }

      const cases = decorateCases(data.cases || [])

      this.setData({
        staff: {
          ...(data.staff || {}),
          phoneDisplay: buildPhoneDisplay(
            (data.staff && (data.staff.phoneFull || data.staff.phone)) || '',
            (data.staff && data.staff.secondPhone) || '',
            !!(data.staff && data.staff.showSecondPhone)
          )
        },
        company: {
          ...(data.company || {}),
          displayAddress: formatTopCardAddress((data.company && (data.company.address || data.company.locationName)) || '')
        },
        cases,
        caseCategories: data.caseCategories || [],
        filteredCases: cases,
        casesLoadingMore: false,
        hasMoreCases: !!data.hasMoreCases,
        nextCaseOffset: Number(data.nextCaseOffset) || cases.length,
        loading: false,
        notFound: false,
        notFoundText: '名片不存在'
      })

      this.writeLog('card_view')
    }).catch((err) => {
      if (['E0101', 'E0302', 'E0401'].includes(err.code)) {
        this.setData({
          loading: false,
          notFound: true,
          notFoundText: '名片不存在',
          staff: null,
          company: null,
          cases: [],
          caseCategories: [],
          filteredCases: [],
          casesLoadingMore: false,
          hasMoreCases: false,
          nextCaseOffset: 0
        })
        return
      }

      this.setData({ loading: false })
      showError(err.message || '加载失败')
    })
  },

  writeLog(logType, caseId) {
    const { staffId, companyId } = this.data
    let shareScene = 'other'
    const scene = this._enterScene

    if (scene === 1007 || scene === 1008) {
      shareScene = 'friend'
    } else if (scene === 1044) {
      shareScene = 'group'
    } else if (scene === 1154) {
      shareScene = 'timeline'
    }

    callCloud('writeViewLog', {
      staffId,
      companyId,
      logType,
      caseId: caseId || null,
      shareScene
    }, {
      showLoading: false,
      silent: true
    }).catch(() => {})
  },

  onCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id || ''
    if (categoryId === this.data.activeCategoryId) {
      return
    }

    this.setData({ activeCategoryId: categoryId })
    this.loadMoreCases({ reset: true, categoryId })
  },

  loadMoreCases(options = {}) {
    const { reset = false, categoryId = this.data.activeCategoryId } = options
    const { staffId, companyId, casesLoadingMore, hasMoreCases, nextCaseOffset } = this.data

    if (!staffId || !companyId || casesLoadingMore) {
      return
    }

    if (!reset && !hasMoreCases) {
      return
    }

    const offset = reset ? 0 : nextCaseOffset
    this.setData({
      casesLoadingMore: true,
      ...(reset ? {
        cases: [],
        filteredCases: [],
        hasMoreCases: false,
        nextCaseOffset: 0
      } : {})
    })

    callCloud('getCardCases', {
      staffId,
      companyId,
      offset,
      limit: CASE_PAGE_SIZE,
      categoryId
    }, {
      showLoading: false,
      silent: true
    }).then((data) => {
      const nextCases = decorateCases(data.cases || [])
      const cases = reset ? nextCases : this.data.cases.concat(nextCases)

      this.setData({
        cases,
        filteredCases: cases,
        hasMoreCases: !!data.hasMoreCases,
        nextCaseOffset: Number(data.nextCaseOffset) || cases.length,
        casesLoadingMore: false
      })
    }).catch((err) => {
      this.setData({ casesLoadingMore: false })
      showError((err && err.message) || '案例加载失败')
    })
  },

  onCaseTap(e) {
    const caseId = e.currentTarget.dataset.caseId
    this.writeLog('case_click', caseId)
    if (!caseId) {
      return
    }

    wx.navigateTo({
      url: `/pages/case-detail/index?caseId=${caseId}&companyId=${this.data.companyId}`
    })
  },

  onCallStaff() {
    const { staff } = this.data
    const phone = (staff && (staff.phoneFull || staff.phone)) || ''
    if (!phone) {
      showError('暂未填写电话')
      return
    }

    wx.makePhoneCall({ phoneNumber: phone.replace(/\*+/g, '') })
  },

  onCopyEmail() {
    const email = this.data.staff && this.data.staff.email
    if (!email) {
      showError('暂未填写邮箱')
      return
    }

    wx.setClipboardData({
      data: email,
      success: () => showSuccess('邮箱已复制')
    })
  },

  onCopyWechat() {
    const wechat = this.data.staff && this.data.staff.wechat
    if (!wechat) {
      showError('暂未填写微信号')
      return
    }

    wx.setClipboardData({
      data: wechat,
      success: () => showSuccess('微信号已复制')
    })
  },

  onOpenMap() {
    const { company } = this.data
    if (!company) {
      return
    }

    if (company.latitude && company.longitude) {
      this.writeLog('company_intro_click')
      wx.openLocation({
        latitude: Number(company.latitude),
        longitude: Number(company.longitude),
        name: company.locationName || company.name,
        address: company.address || '',
        scale: 16
      })
      return
    }

    const addressText = company.address || company.locationName
    if (!addressText) {
      showError('暂未设置公司地址')
      return
    }

    wx.setClipboardData({
      data: addressText,
      success: () => showToast('地址已复制')
    })
  },

  onLongPressAvatar() {
    const avatarUrl = this.data.staff && this.data.staff.avatar
    if (!avatarUrl) {
      return
    }

    wx.previewImage({
      urls: [avatarUrl],
      current: avatarUrl
    })
  },

  onSaveContact() {
    const { staff, company } = this.data
    const mobilePhoneNumber = normalizePhone((staff && (staff.phoneFull || staff.phone)) || '')
    if (!staff || !staff.name) {
      showError('暂无可保存的联系人信息')
      return
    }

    if (!mobilePhoneNumber) {
      showError('暂未填写手机号，无法存入通讯录')
      return
    }

    const companyPhone = normalizePhone((company && company.phone) || '')
    const companyAddress = (company && (company.address || company.locationName)) || ''
    const companyWebsite = normalizeWebsite((company && company.website) || '')

    wx.addPhoneContact({
      firstName: staff.name,
      mobilePhoneNumber,
      weChatNumber: staff.wechat || '',
      email: staff.email || '',
      organization: (company && company.name) || '',
      title: staff.title || '',
      workPhoneNumber: companyPhone,
      hostNumber: companyPhone,
      workAddressStreet: companyAddress,
      url: companyWebsite,
      remark: '来自电子名片',
      success: () => {
        showSuccess('已拉起通讯录保存界面')
      },
      fail: (error) => {
        if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
          return
        }
        showError('存入通讯录失败，请稍后重试')
      }
    })
  }
})
