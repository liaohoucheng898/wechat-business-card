<template>
  <div class="stats-page">
    <!-- 顶部筛选 -->
    <div class="page-header">
      <span class="page-title">企业数据统计</span>
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
    </div>

    <!-- ECharts 折线图 -->
    <div class="card-wrapper chart-section">
      <div ref="chartRef" class="chart-container" />
    </div>

    <!-- 员工排行榜 -->
    <div class="card-wrapper rank-section">
      <div class="section-header">
        <span class="section-title">员工排行榜</span>
        <span class="section-tip">仅展示启用状态员工</span>
      </div>
      <el-table :data="rankList" v-loading="loading" stripe>
        <el-table-column label="排名" width="70" align="center">
          <template #default="{ $index }">
            <span v-if="$index === 0" class="rank-medal">🥇</span>
            <span v-else-if="$index === 1" class="rank-medal">🥈</span>
            <span v-else-if="$index === 2" class="rank-medal">🥉</span>
            <span v-else class="rank-num">{{ $index + 1 }}</span>
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
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { callFunction } from '@/cloud/api'
import { mapTempFileURLs } from '@/cloud/file'
import CompanyTabs from '@/components/CompanyTabs.vue'

const companyId = ref('')
const timeRange = ref('week')
const loading = ref(false)

const overview = ref({
  periodViews: 0,
  totalViews: 0,
  changePercent: null
})

const chartData = ref({ dates: [], values: [] })
const rankList = ref([])

const chartRef = ref(null)
let chartInstance = null

function formatNumber(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString()
}

async function fetchStats() {
  loading.value = true
  try {
    const params = { timeRange: timeRange.value }
    if (companyId.value) {
      params.companyId = companyId.value
    }
    const data = await callFunction('adminGetStats', params)

    // 总览
    overview.value = {
      periodViews: data.overview?.periodViews ?? 0,
      totalViews: data.overview?.totalViews ?? 0,
      changePercent: data.overview?.changePercent ?? null
    }

    // 折线图
    chartData.value = {
      dates: data.chart?.dates || [],
      values: data.chart?.values || []
    }

    // 员工排行（按近30天降序）
    const list = [...(data.staffRank || [])]
    list.sort((a, b) => (b.monthViews || 0) - (a.monthViews || 0))
    rankList.value = await mapTempFileURLs(list, 'avatar')

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
  .filter-bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  // ---- 总览卡片 ----
  .overview-cards {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  .stat-card {
    flex: 1;
    background: $card-bg;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
  }

  // ---- 折线图 ----
  .chart-section {
    margin-bottom: 20px;
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

    .rank-medal {
      font-size: 18px;
    }

    .rank-num {
      font-family: 'Inter', '思源黑体', 'Source Han Sans SC', 'Source Han Sans CN', 'Source Han Sans', sans-serif;
      font-weight: 600;
      color: $text-secondary;
    }

    .staff-cell {
      display: flex;
      align-items: center;
      gap: 10px;

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
