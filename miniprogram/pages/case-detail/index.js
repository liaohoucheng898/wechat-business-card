const { callCloud } = require('../../utils/cloud')
const { showError } = require('../../utils/toast')

Page({
  data: {
    loading: true,
    caseId: '',
    companyId: '',
    caseDetail: null,
  },

  onLoad(options) {
    const { caseId = '', companyId = '' } = options || {}
    if (!caseId) {
      wx.navigateBack({ delta: 1 })
      return
    }

    this.setData({ caseId, companyId })
    this.loadDetail()
  },

  loadDetail() {
    const { caseId, companyId } = this.data

    callCloud('getCaseDetail', { caseId, companyId }, {
      showLoading: false,
      silent: true,
    }).then((data) => {
      this.setData({
        loading: false,
        caseDetail: data || null,
      })

      if (data && data.title) {
        wx.setNavigationBarTitle({ title: data.title })
      }
    }).catch((err) => {
      this.setData({ loading: false })
      showError(err.message || '加载案例详情失败')
    })
  },
})
