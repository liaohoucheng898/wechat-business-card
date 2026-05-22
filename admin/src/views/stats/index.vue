<template>
  <div class="stats-page">
    <!-- 顶部筛选 -->
    <div class="page-header">
      <div class="title-block">
        <h1 class="page-title">数据分析</h1>
      </div>
    </div>

    <div class="filter-bar">
      <CompanyTabs v-model="companyId" @change="fetchStats" />
      <div class="time-tabs">
        <el-radio-group v-model="timeRange" size="default" @change="fetchStats">
          <el-radio-button label="week">近7天</el-radio-button>
          <el-radio-button label="half_month">近15天</el-radio-button>
          <el-radio-button label="month">近30天</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <el-alert class="trust-alert" type="info" :closable="false" show-icon>
      <template #title>
        <div class="trust-alert-content">
          <span>统计口径：只统计外部访客打开名片产生的访问记录；已登录员工访问不计入。数据更新时间以当前页面刷新完成时间为准。</span>
          <span v-if="lastUpdatedAt" class="last-updated">更新时间：{{ lastUpdatedAt }}</span>
        </div>
      </template>
    </el-alert>

    <div class="stats-content" v-loading="loading">
      <!-- 总览卡片 -->
      <div class="overview-cards">
        <div class="stat-card">
          <div class="stat-label">期间浏览量</div>
          <div class="stat-value">{{ formatNumber(overview.periodViews) }}</div>
          <div v-if="overview.changePercent !== null" class="stat-change">
            较上一周期
            <span :class="overview.changePercent >= 0 ? 'up' : 'down'">
              {{ overview.changePercent >= 0 ? '↑' : '↓' }}{{ Math.abs(overview.changePercent) }}%
            </span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">累计浏览量</div>
          <div class="stat-value">{{ formatNumber(overview.totalViews) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">高活跃员工</div>
          <div class="stat-value">{{ formatNumber(activeRankCount) }}</div>
          <div class="stat-desc">近30天浏览量 ≥ 500 的启用员工</div>
        </div>
      </div>

      <!-- ECharts 折线图 -->
      <div class="card-wrapper chart-section">
        <div class="section-header">
          <span class="section-title">趋势图</span>
        </div>
        <div ref="chartRef" class="chart-container" />
      </div>

      <!-- 员工排行榜 -->
      <div class="card-wrapper rank-section">
        <div class="section-header">
          <span class="section-title">员工排行榜</span>
          <span class="section-tip">仅展示启用状态员工</span>
        </div>
        <el-table :data="rankList" stripe>
          <el-table-column label="排名" width="70" align="center">
            <template #default="{ $index }">
              <span class="rank-num">{{ $index + 1 }}</span>
            </template>
          </el-table-column>

          <el-table-column label="员工" min-width="160">
            <template #default="{ row }">
              <div class="staff-cell">
                <el-avatar :size="32" :src="row.avatar" />
                <span class="staff-name">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="近7天" prop="weekViews" width="100" align="right">
            <template #default="{ row }">
              <span class="num-cell">{{ formatNumber(row.weekViews) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="近15天" prop="halfMonthViews" width="100" align="right">
            <template #default="{ row }">
              <span class="num-cell">{{ formatNumber(row.halfMonthViews) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="近30天" prop="monthViews" width="100" align="right" sortable>
            <template #default="{ row }">
              <span class="num-cell">{{ formatNumber(row.monthViews) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="累计浏览量" prop="totalViews" width="120" align="right">
            <template #default="{ row }">
              <span class="num-cell">{{ formatNumber(row.totalViews) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { callFunction } from '@/cloud/api'
import { mapTempFileURLs } from '@/cloud/file'
import CompanyTabs from '@/components/CompanyTabs.vue'

const companyId = ref('')
const timeRange = ref('month')
const loading = ref(false)
const lastUpdatedAt = ref('')

const overview = ref({
  periodViews: 0,
  totalViews: 0,
  changePercent: null
})

const chartData = ref({ dates: [], values: [] })
const rankList = ref([])
const activeRankCount = computed(() => rankList.value.filter((item) => Number(item.monthViews || 0) >= 500).length)

const chartRef = ref(null)
let chartInstance = null

function formatNumber(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString()
}

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function normalizeRankList(data = {}) {
  const source = Array.isArray(data.staffRank) && data.staffRank.length
    ? data.staffRank
    : Array.isArray(data.ranking)
      ? data.ranking
      : []

  return source.map((item) => ({
    ...item,
    weekViews: item.weekViews ?? item.views7d ?? 0,
    halfMonthViews: item.halfMonthViews ?? item.views15d ?? 0,
    monthViews: item.monthViews ?? item.views30d ?? 0,
    totalViews: item.totalViews ?? item.viewsTotal ?? 0
  }))
}

function normalizeOverview(data = {}) {
  return {
    periodViews: data.overview?.periodViews ?? data.periodTotal ?? 0,
    totalViews: data.overview?.totalViews ?? data.allTimeTotal ?? 0,
    changePercent: data.overview?.changePercent ?? null
  }
}

function normalizeChartData(data = {}) {
  const trend = Array.isArray(data.trend) ? data.trend : []

  return {
    dates: data.chart?.dates ?? trend.map((item) => item.date),
    values: data.chart?.values ?? trend.map((item) => item.count ?? 0)
  }
}

async function fetchStats() {
  loading.value = true
  try {
    const params = { timeRange: timeRange.value }
    if (companyId.value) {
      params.companyId = companyId.value
    }
    const data = await callFunction('adminGetStats', params, { loading: false })

    // 总览
    overview.value = normalizeOverview(data)

    // 折线图
    chartData.value = normalizeChartData(data)

    // 员工排行（按近30天降序）
    const list = normalizeRankList(data)
    list.sort((a, b) => (b.monthViews || 0) - (a.monthViews || 0))
    rankList.value = await mapTempFileURLs(list, 'avatar')
    lastUpdatedAt.value = formatDateTime(new Date())

    await nextTick()
    renderChart()
  } catch {
    // api.js 已统一处理
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#DBDEE3',
      borderWidth: 1,
      textStyle: { color: '#1F2329', fontSize: 13 },
      formatter: (params) => {
        const p = params[0]
        return `${p.axisValueLabel}<br/>浏览量：<b>${Number(p.value).toLocaleString()}</b>`
      }
    },
    grid: {
      top: 24,
      right: 24,
      bottom: 32,
      left: 48
    },
    xAxis: {
      type: 'category',
      data: chartData.value.dates,
      axisLine: { lineStyle: { color: '#DBDEE3' } },
      axisTick: { show: false },
      axisLabel: { color: '#646A73', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#DBDEE3' } },
      axisLabel: { color: '#646A73', fontSize: 12 }
    },
    series: [
      {
        type: 'line',
        data: chartData.value.values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        itemStyle: { color: '#1677ff' },
        lineStyle: { width: 2, color: '#1677ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 119, 255, 0.25)' },
            { offset: 1, color: 'rgba(22, 119, 255, 0.02)' }
          ])
        }
      }
    ]
  }

  chartInstance.setOption(option, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  fetchStats()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.stats-page {
  .stats-content {
    display: flex;
    flex-direction: column;
    gap: $spacing-base;
  }

  .filter-bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
  }

  .trust-alert {
    margin-bottom: 16px;
  }

  .trust-alert-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 16px;
    line-height: 20px;
  }

  .last-updated {
    color: $text-auxiliary;
    font-weight: 400;
    white-space: nowrap;
  }

  // ---- 总览卡片 ----
  .overview-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .stat-card {
    flex: 1;
    min-width: 220px;
    background: $card-bg;
    border: 1px solid $border-color;
    border-radius: $radius-card;
    box-shadow: $shadow-card;
    padding: 20px 24px;

    .stat-label {
      font-size: 13px;
      color: $text-secondary;
      margin-bottom: 8px;
    }

    .stat-value {
      font-family: 'Inter', '思源黑体', 'Source Han Sans SC', 'Source Han Sans CN', 'Source Han Sans', sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: $text-primary;
      line-height: 1.2;
    }

    .stat-change {
      margin-top: 6px;
      font-size: 12px;
      color: $text-auxiliary;

      .up {
        color: $color-success;
        font-weight: 600;
      }

      .down {
        color: $color-error;
        font-weight: 600;
      }
    }

    .stat-desc {
      margin-top: 6px;
      font-size: 12px;
      color: $text-auxiliary;
    }
  }

  // ---- 折线图 ----
  .chart-section {
    margin-bottom: 0;
  }

  .chart-container {
    width: 100%;
    height: 320px;
  }

  // ---- 员工排行榜 ----
  .rank-section {
    .section-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
    }

    .section-tip {
      font-size: 12px;
      color: $text-auxiliary;
    }

    .rank-num {
      font-family: $font-family-number;
      font-weight: 600;
      color: $text-secondary;
    }

    .staff-cell {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .staff-name {
        font-size: 15px;
        color: $text-primary;
      }
    }

    .num-cell {
      font-family: 'Inter', '思源黑体', 'Source Han Sans SC', 'Source Han Sans CN', 'Source Han Sans', sans-serif;
      font-weight: 600;
      color: $text-primary;
    }
  }
}
</style>
