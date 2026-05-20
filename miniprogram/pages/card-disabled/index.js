Page({
  data: {
    companyPhone: '',
    companyName: ''
  },

  onLoad(options) {
    this.setData({
      companyPhone: decodeURIComponent(options.companyPhone || ''),
      companyName: decodeURIComponent(options.companyName || '')
    })
  },

  onCallCompany() {
    const phone = this.data.companyPhone
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone })
    }
  }
})
