const { callCloudWithToken } = require('../../utils/cloud')
const auth = require('../../utils/auth')

function formatUpdateTime(date) {
  const now = date || new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `今天 ${hours}:${minutes}`
}

function getTimeLabel(timeOptions, value) {
  const current = timeOptions.find((item) => item.value === value)
  return current ? current.label : '近15天'
}

Page({
  data: {
    loading: true,
    timeOptions: [
      { label: '近7天', value: 'week' },
      { label: '近15天', value: 'half_month' },
      { label: '近30天', value: 'month' }
    ],
    activeTime: 'half_month',
    activeTimeLabel: '近15天',
    periodTotal: 0,
    allTimeTotal: 0,
    trend: [],
    updateTimeText: '--'
  },

  onLoad() {
    this._fetchStats()
  },

  onTimeTab(e) {
    const value = e.currentTarget.dataset.value
    if (value === this.data.activeTime) return

    this.setData({
      activeTime: value,
      activeTimeLabel: getTimeLabel(this.data.timeOptions, value),
      loading: true
    })

    this._fetchStats()
  },

  _fetchStats() {
    const staffInfo = auth.getStaffInfo()
    if (!staffInfo) {
      wx.redirectTo({ url: '/pages/bind-phone/index' })
      return
    }

    callCloudWithToken('getMyStats', {
      staffId: staffInfo.staffId,
      companyId: 'all',
      timeRange: this.data.activeTime
    }, { showLoading: false }).then(data => {
      this.setData({
        periodTotal: data.periodTotal || 0,
        allTimeTotal: data.allTimeTotal || 0,
        trend: data.trend || [],
        updateTimeText: formatUpdateTime(new Date()),
        activeTimeLabel: getTimeLabel(this.data.timeOptions, this.data.activeTime),
        loading: false
      })

      if (data.trend && data.trend.length > 0) {
        setTimeout(() => this._drawChart(), 100)
      }
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  _drawChart() {
    const query = this.createSelectorQuery()
    query.select('#trendChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getWindowInfo().pixelRatio || 2
        const width = res[0].width
        const height = res[0].height

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        this._renderLineChart(ctx, width, height)
      })
  },

  _renderLineChart(ctx, width, height) {
    const { trend } = this.data
    if (!trend || trend.length === 0) return

    const padding = { top: 28, right: 16, bottom: 54, left: 44 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom
    const counts = trend.map(t => t.count)
    const maxCount = Math.max(...counts, 1)
    const yMax = Math.ceil(maxCount / 5) * 5 || 5
    const pointCount = trend.length

    ctx.clearRect(0, 0, width, height)

    const yTicks = 4
    ctx.strokeStyle = '#EEF2F7'
    ctx.lineWidth = 0.5
    ctx.fillStyle = '#90A0B5'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    for (let i = 0; i <= yTicks; i++) {
      const y = padding.top + chartH - (chartH / yTicks) * i
      const val = Math.round((yMax / yTicks) * i)

      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      ctx.fillText(String(val), padding.left - 8, y)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#98A5B6'
    ctx.font = '9px sans-serif'

    const labelStep = pointCount <= 7 ? 1 : pointCount <= 15 ? 2 : 4
    trend.forEach((t, i) => {
      if (i % labelStep === 0 || i === pointCount - 1) {
        const x = padding.left + (chartW / (pointCount - 1 || 1)) * i
        const dateStr = t.date.slice(5)
        ctx.fillText(dateStr, x, padding.top + chartH + 10)
      }
    })

    const points = trend.map((t, i) => ({
      x: padding.left + (chartW / (pointCount - 1 || 1)) * i,
      y: padding.top + chartH - (t.count / yMax) * chartH
    }))

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH)
    gradient.addColorStop(0, 'rgba(22, 119, 255, 0.18)')
    gradient.addColorStop(1, 'rgba(22, 119, 255, 0.01)')

    ctx.beginPath()
    ctx.moveTo(points[0].x, padding.top + chartH)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.strokeStyle = '#1677FF'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()

    points.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.strokeStyle = '#1677FF'
      ctx.lineWidth = 2.5
      ctx.stroke()
    })
  }
})
