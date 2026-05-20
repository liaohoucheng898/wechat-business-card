const { callCloud } = require('../../utils/cloud')
const auth = require('../../utils/auth')
const config = require('../../config/env')

const FIXED_COMPANY_ORDER = ['company_001', 'company_002', 'company_003']
const FIXED_SHARE_TITLE = '有幸相识，愿您乘风破浪'
const CARD_TOP_ADDRESS_MAP = {
  '海南省海口市海秀中路71号海垦广场B座11楼1105': '海南省海口市海秀中路71号海垦广场B座11楼'
}

function formatTopCardAddress(address = '') {
  return CARD_TOP_ADDRESS_MAP[address] || address
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

Page({
  data: {
    loading: true,
    staffInfo: null,
    companyTabs: [],
    activeCompanyId: '',
    currentCard: null,
    defaultAvatar: config.defaultAvatar
  },

  onLoad() {
    this._cardCache = {}
    this._requestSeed = 0
    this._loadDataAfterAuth()
  },

  onShow() {
    this._syncStaffInfo()
  },

  _waitForAuthReady() {
    const app = getApp()
    if (app && typeof app.waitForAuthReady === 'function') {
      return app.waitForAuthReady()
    }
    if (app && typeof app.autoLogin === 'function') {
      return app.autoLogin()
    }
    return Promise.resolve()
  },

  _loadDataAfterAuth() {
    this._waitForAuthReady().then(() => {
      this._loadData()
    }).catch(() => {
      this._loadData()
    })
  },

  _loadData() {
    if (!auth.isLoggedIn()) {
      this.setData({ loading: false })
      return
    }

    const staffInfo = auth.getStaffInfo()
    if (!staffInfo) {
      this.setData({ loading: false })
      return
    }

    this._syncLocalState(staffInfo, true)
  },

  _syncStaffInfo() {
    this._waitForAuthReady().then(() => {
      if (!auth.isLoggedIn()) {
        return null
      }
      return callCloud('login', {}, { showLoading: false, silent: true })
    }).then((data) => {
      if (!data || data.needBind || !data.staffInfo) {
        return
      }

      auth.saveSession(data.sessionToken, data.sessionExpireAt, data.staffInfo)
      const app = getApp()
      if (app && app.globalData) {
        const authResult = {
          loggedIn: true,
          needBind: false,
          staffInfo: data.staffInfo,
          sessionToken: data.sessionToken
        }
        app.globalData.staffInfo = data.staffInfo
        app.globalData.sessionToken = data.sessionToken
        app.globalData.authReady = true
        app.globalData.authResult = authResult
        app.globalData.authPromise = Promise.resolve(authResult)
      }
      this._syncLocalState(data.staffInfo, false)
    }).catch(() => {})
  },

  _syncLocalState(staffInfo, isInitialLoad) {
    const companyTabs = this._buildCompanyTabs(staffInfo)
    const activeCompanyId = this._getActiveCompanyId(companyTabs, this.data.activeCompanyId)
    const currentCard = activeCompanyId ? this._buildFallbackCard(staffInfo, companyTabs, activeCompanyId) : null

    this._cardCache = {}
    this.setData({
      loading: isInitialLoad,
      staffInfo,
      companyTabs,
      activeCompanyId,
      currentCard
    })

    if (!activeCompanyId) {
      this.setData({ loading: false })
      return
    }

    this._loadAllCompanyCards(staffInfo, companyTabs, activeCompanyId)
  },

  _buildCompanyTabs(staffInfo) {
    const enabledMap = {}
    ;(staffInfo.enabledCompanies || []).forEach((item) => {
      enabledMap[item.companyId] = item.title || ''
    })

    return FIXED_COMPANY_ORDER.map((companyId) => ({
      companyId,
      companyName: config.companyMap[companyId] || companyId,
      title: enabledMap[companyId] || '',
      enabled: Object.prototype.hasOwnProperty.call(enabledMap, companyId)
    }))
  },

  _getActiveCompanyId(companyTabs, currentCompanyId) {
    const currentTab = companyTabs.find((item) => item.companyId === currentCompanyId && item.enabled)
    if (currentTab) {
      return currentCompanyId
    }

    const firstEnabled = companyTabs.find((item) => item.enabled)
    return firstEnabled ? firstEnabled.companyId : ''
  },

  _buildFallbackCard(staffInfo, companyTabs, companyId) {
    const match = companyTabs.find((item) => item.companyId === companyId)
    return {
      companyId,
      staff: {
        name: staffInfo.name || '',
        title: match ? match.title : '',
        avatar: staffInfo.avatar || staffInfo.avatarOriginal || '',
        phone: staffInfo.phone || '',
        phoneFull: staffInfo.phone || '',
        secondPhone: staffInfo.secondPhone || '',
        showSecondPhone: !!staffInfo.showSecondPhone,
        phoneDisplay: buildPhoneDisplay(staffInfo.phone || '', staffInfo.secondPhone || '', !!staffInfo.showSecondPhone),
        wechat: staffInfo.wechat || '',
        email: staffInfo.email || ''
      },
      company: {
        name: match ? match.companyName : (config.companyMap[companyId] || companyId),
        address: '',
        displayAddress: '',
        locationName: '',
        latitude: null,
        longitude: null
      }
    }
  },

  _formatCardData(staffInfo, companyTabs, companyId, cardInfo) {
    const fallback = this._buildFallbackCard(staffInfo, companyTabs, companyId)
    if (!cardInfo) {
      return fallback
    }

    return {
      companyId,
      staff: {
        ...fallback.staff,
        ...(cardInfo.staff || {}),
        phoneDisplay: buildPhoneDisplay(
          ((cardInfo.staff && (cardInfo.staff.phoneFull || cardInfo.staff.phone)) || fallback.staff.phoneFull || fallback.staff.phone || ''),
          ((cardInfo.staff && cardInfo.staff.secondPhone) || fallback.staff.secondPhone || ''),
          !!((cardInfo.staff && cardInfo.staff.showSecondPhone) || fallback.staff.showSecondPhone)
        )
      },
      company: {
        ...fallback.company,
        ...(cardInfo.company || {}),
        displayAddress: formatTopCardAddress(
          ((cardInfo.company && (cardInfo.company.address || cardInfo.company.locationName)) || fallback.company.address || fallback.company.locationName || '')
        )
      }
    }
  },

  _loadAllCompanyCards(staffInfo, companyTabs, activeCompanyId) {
    const enabledIds = companyTabs.filter((item) => item.enabled).map((item) => item.companyId)
    if (!enabledIds.length) {
      this.setData({ loading: false, currentCard: null })
      return
    }

    const requestId = ++this._requestSeed
    const tasks = enabledIds.map((companyId) => callCloud(
      'getCardInfo',
      { staffId: staffInfo.staffId, companyId },
      { showLoading: false, silent: true }
    ).then((data) => ({ companyId, data })).catch(() => null))

    Promise.all(tasks).then((results) => {
      if (requestId !== this._requestSeed) {
        return
      }

      const cache = {}
      results.forEach((item) => {
        if (item && item.data && !item.data.disabled) {
          cache[item.companyId] = item.data
        }
      })
      this._cardCache = cache

      const resolvedCompanyId = cache[activeCompanyId]
        ? activeCompanyId
        : this._getActiveCompanyId(companyTabs, activeCompanyId)
      const currentCard = resolvedCompanyId
        ? this._formatCardData(staffInfo, companyTabs, resolvedCompanyId, cache[resolvedCompanyId])
        : null

      this.setData({
        loading: false,
        activeCompanyId: resolvedCompanyId,
        currentCard
      })
    }).catch(() => {
      if (requestId !== this._requestSeed) {
        return
      }

      this.setData({ loading: false })
    })
  },

  _loadSingleCompanyCard(companyId) {
    const { staffInfo, companyTabs } = this.data
    if (!staffInfo || !companyId) {
      return
    }

    const requestId = ++this._requestSeed
    callCloud(
      'getCardInfo',
      { staffId: staffInfo.staffId, companyId },
      { showLoading: false, silent: true }
    ).then((data) => {
      if (requestId !== this._requestSeed || !data || data.disabled) {
        return
      }

      this._cardCache[companyId] = data
      this.setData({
        currentCard: this._formatCardData(staffInfo, companyTabs, companyId, data)
      })
    }).catch(() => {})
  },

  onCompanyTab(e) {
    const companyId = e.currentTarget.dataset.id
    const enabled = e.currentTarget.dataset.enabled === true || e.currentTarget.dataset.enabled === 'true'
    if (!enabled || companyId === this.data.activeCompanyId) {
      return
    }

    const cachedCard = this._cardCache[companyId]
    if (cachedCard) {
      this.setData({
        activeCompanyId: companyId,
        currentCard: this._formatCardData(this.data.staffInfo, this.data.companyTabs, companyId, cachedCard)
      })
      return
    }

    this.setData({
      activeCompanyId: companyId,
      currentCard: this._buildFallbackCard(this.data.staffInfo, this.data.companyTabs, companyId)
    })
    this._loadSingleCompanyCard(companyId)
  },

  goEdit() {
    wx.navigateTo({ url: '/pages/edit-card/index' })
  },

  goStats() {
    wx.navigateTo({ url: '/pages/my-stats/index' })
  },

  goBind() {
    wx.redirectTo({ url: '/pages/bind-phone/index' })
  },

  onShareAppMessage() {
    const { staffInfo, activeCompanyId } = this.data
    const shareCompanyId = activeCompanyId

    return {
      title: FIXED_SHARE_TITLE,
      path: `/pages/card/index?staffId=${staffInfo.staffId}&companyId=${shareCompanyId}`
    }
  },

  onCallStaff() {
    const phone = this.data.currentCard && this.data.currentCard.staff
      ? (this.data.currentCard.staff.phoneFull || this.data.currentCard.staff.phone)
      : ''
    if (!phone) {
      wx.showToast({ title: '暂未填写电话', icon: 'none' })
      return
    }

    wx.makePhoneCall({ phoneNumber: phone.replace(/\*+/g, '') })
  },

  onCopyEmail() {
    const email = this.data.currentCard && this.data.currentCard.staff
      ? this.data.currentCard.staff.email
      : ''
    if (!email) {
      wx.showToast({ title: '暂未填写邮箱', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: email,
      success: () => wx.showToast({ title: '邮箱已复制', icon: 'none' })
    })
  },

  onOpenMap() {
    const company = this.data.currentCard && this.data.currentCard.company
    if (!company) {
      return
    }

    if (company.latitude && company.longitude) {
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
      wx.showToast({ title: '暂未设置公司地址', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: addressText,
      success: () => wx.showToast({ title: '地址已复制', icon: 'none' })
    })
  },

  onCopyWechat() {
    const wechat = this.data.currentCard && this.data.currentCard.staff
      ? this.data.currentCard.staff.wechat
      : ''
    if (!wechat) {
      wx.showToast({ title: '暂未填写微信号', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'none' })
    })
  },

  onPreviewAvatar() {
    const avatarUrl = this.data.currentCard && this.data.currentCard.staff
      ? this.data.currentCard.staff.avatar
      : ''
    if (!avatarUrl) {
      return
    }

    wx.previewImage({
      urls: [avatarUrl],
      current: avatarUrl
    })
  }
})
