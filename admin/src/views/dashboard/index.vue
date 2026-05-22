<template>
  <div class="page-container dashboard-page">
    <div class="page-header dashboard-header">
      <div>
        <h1 class="page-title">运营驾驶舱</h1>
        <p class="page-desc">先看关键结果、异常风险和待处理事项，再进入具体管理页面。</p>
      </div>

      <div class="dashboard-filters">
        <el-select
          v-model="companyId"
          class="dashboard-filter"
          placeholder="全部公司"
          @change="fetchDashboard"
        >
          <el-option label="全部公司" value="" />
          <el-option
            v-for="item in companyOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <el-radio-group v-model="timeRange" @change="fetchDashboard">
          <el-radio-button
            v-for="item in timeRangeOptions"
            :key="item.value"
            :label="item.value"
          >
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>

        <el-button type="primary" :loading="loading" @click="fetchDashboard">刷新数据</el-button>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      class="dashboard-alert"
      type="error"
      title="运营驾驶舱数据加载失败"
      :description="errorMessage"
      show-icon
      :closable="false"
    />

    <section class="metric-grid" v-loading="loading">
      <article
        v-for="item in metricCards"
        :key="item.key"
        class="metric-card"
        :class="`metric-card--${item.tone}`"
      >
        <div class="metric-card__header">
          <span class="metric-card__label">{{ item.label }}</span>
          <el-tag size="small" effect="plain" :type="item.tagType">{{ item.tag }}</el-tag>
        </div>
        <div class="metric-card__value num-cell">{{ item.value }}</div>
        <p class="metric-card__desc">{{ item.desc }}</p>
      </article>
    </section>

    <div class="dashboard-main-grid">
      <section class="admin-panel trend-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">浏览趋势</h2>
            <p class="panel-desc">按天统计，排除内部员工访问。</p>
          </div>
          <el-tag effect="plain">{{ currentCompanyName }}</el-tag>
        </div>

        <div v-if="hasTrendData" class="trend-chart" role="img" aria-label="浏览趋势柱状图">
          <div class="trend-chart__plot">
            <div
              v-for="item in chartBars"
              :key="item.date"
              class="trend-chart__bar-item"
            >
              <span class="trend-chart__value num-cell">{{ formatNumber(item.value) }}</span>
              <span class="trend-chart__bar" :style="{ height: item.height }" />
              <span class="trend-chart__date">{{ item.shortDate }}</span>
            </div>
          </div>
        </div>

        <el-empty
          v-else
          description="暂无趋势数据，可切换公司或时间范围后重试。"
        />
      </section>

      <section class="admin-panel risk-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">风险与待处理</h2>
            <p class="panel-desc">页面内持续展示，不只依赖短暂提示。</p>
          </div>
          <el-button link type="primary" @click="goTo('/cases')">查看全部</el-button>
        </div>

        <div class="risk-list">
          <article
            v-for="item in riskItems"
            :key="item.title"
            class="risk-item"
            :class="`risk-item--${item.type}`"
          >
            <div class="risk-item__content">
              <strong>{{ item.title }}</strong>
              <span>{{ item.desc }}</span>
            </div>
            <el-button type="primary" link @click="goTo(item.route)">
              {{ item.action }}
            </el-button>
          </article>
        </div>
      </section>
    </div>

    <div class="dashboard-main-grid dashboard-main-grid--bottom">
      <section class="admin-panel rank-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">员工表现排行</h2>
            <p class="panel-desc">按近30天浏览量排序。</p>
          </div>
          <el-button type="primary" link @click="goTo('/stats')">查看统计</el-button>
        </div>

        <el-table
          :data="staffRank"
          v-loading="loading"
          stripe
          empty-text="暂无员工排行数据"
        >
          <el-table-column label="排名" width="72" align="center">
            <template #default="{ $index }">
              <span class="rank-index">{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="员工" min-width="140">
            <template #default="{ row }">
              <div class="staff-cell">
                <strong>{{ row.name || row.staffName || '-' }}</strong>
                <span>{{ row.title || row.position || '暂无职位' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="公司" min-width="110">
            <template #default="{ row }">
              {{ row.companyName || getCompanyName(row.companyId) }}
            </template>
          </el-table-column>
          <el-table-column label="近 7 天" prop="weekViews" width="100" align="right">
            <template #default="{ row }">
              <span class="num-cell">{{ formatNumber(row.weekViews) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="近 30 天" prop="monthViews" width="110" align="right">
            <template #default="{ row }">
              <span class="num-cell">{{ formatNumber(row.monthViews) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="累计浏览" prop="totalViews" width="110" align="right">
            <template #default="{ row }">
              <span class="num-cell">{{ formatNumber(row.totalViews) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'disabled' ? 'warning' : 'success'" effect="plain" size="small">
                {{ row.status === 'disabled' ? '待跟进' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="admin-panel operation-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">最近操作</h2>
            <p class="panel-desc">用于追溯，不用于装饰。</p>
          </div>
          <el-button type="primary" link disabled>操作日志</el-button>
        </div>

        <div class="operation-list">
          <article class="operation-item">
            <span class="operation-item__label">数据刷新</span>
            <strong>{{ lastUpdatedAt || '-' }}</strong>
            <p>本页数据来自统计、员工和案例现有接口，未新增后台日志接口。</p>
          </article>
          <article class="operation-item">
            <span class="operation-item__label">当前筛选</span>
            <strong>{{ currentCompanyName }} · {{ currentTimeRangeLabel }}</strong>
            <p>公司筛选会同步影响案例列表和统计数据，员工总数按现有员工接口计算。</p>
          </article>
          <article class="operation-item">
            <span class="operation-item__label">内容状态</span>
            <strong>{{ formatNumber(visibleCaseCount) }} 个可见案例</strong>
            <p>其中 {{ formatNumber(missingCategoryCount) }} 个案例缺少归属栏目。</p>
          </article>
        </div>

        <el-empty
          v-if="!loading && !caseList.length"
          description="暂无案例数据，可先进入内容中心新建案例。"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminGetCaseList, adminGetStaffList, adminGetStats } from '@/cloud/api'
import { COMPANY_MAP } from '@/config/env'

const router = useRouter()
const loading = ref(false)
const companyId = ref('')
const timeRange = ref('month')
const overview = ref({ periodViews: 0, totalViews: 0, changePercent: null })
const chartData = ref({ dates: [], values: [] })
const staffRank = ref([])
const staffList = ref([])
const caseList = ref([])
const lastUpdatedAt = ref('')
const errorMessage = ref('')

const STAFF_PAGE_SIZE = 100
let dashboardRequestSeq = 0

const timeRangeOptions = [
  { label: '近 7 天', value: 'week' },
  { label: '近 15 天', value: 'half_month' },
  { label: '近 30 天', value: 'month' }
]

const companyOptions = computed(() => Object.entries(COMPANY_MAP).map(([value, label]) => ({
  value,
  label
})))

const currentCompanyName = computed(() => companyId.value ? getCompanyName(companyId.value) : '全部公司')
const currentTimeRangeLabel = computed(() => timeRangeOptions.find((item) => item.value === timeRange.value)?.label || '近 30 天')
const activeStaffCount = computed(() => staffList.value.filter((item) => item.status !== 'disabled').length)
const unboundStaffCount = computed(() => staffList.value.filter((item) => !item.isBound).length)
const visibleCaseCount = computed(() => caseList.value.filter((item) => item.visible !== false).length)
const missingCategoryCount = computed(() => caseList.value.filter((item) => !item.categories?.length).length)
const riskCount = computed(() => unboundStaffCount.value + missingCategoryCount.value)

const riskItems = computed(() => [
  {
    title: `${missingCategoryCount.value} 个案例没有归属栏目`,
    desc: '会影响小程序端客户案例筛选体验',
    type: missingCategoryCount.value ? 'warning' : 'success',
    action: '去处理',
    route: '/cases'
  },
  {
    title: `${unboundStaffCount.value} 名员工尚未绑定微信`,
    desc: '已创建账号但员工可能还未完成首次小程序绑定',
    type: unboundStaffCount.value ? 'warning' : 'success',
    action: '查看员工',
    route: '/staff'
  },
  {
    title: '统计口径已排除内部员工访问',
    desc: `当前数据更新时间：${lastUpdatedAt.value || '-'}`,
    type: 'info',
    action: '查看统计',
    route: '/stats'
  }
])

const metricCards = computed(() => [
  {
    key: 'periodViews',
    label: '期间浏览量',
    value: formatNumber(overview.value.periodViews),
    tag: getChangeText(),
    tagType: overview.value.changePercent === null ? 'info' : overview.value.changePercent >= 0 ? 'success' : 'danger',
    desc: `当前筛选范围内 ${currentTimeRangeLabel.value} 的客户访问量。`,
    tone: 'primary'
  },
  {
    key: 'activeStaff',
    label: '活跃员工',
    value: formatNumber(activeStaffCount.value),
    tag: `${formatNumber(staffList.value.length)} 人总数`,
    tagType: 'info',
    desc: '统计未停用员工，用于判断名片承接能力。',
    tone: 'success'
  },
  {
    key: 'visibleCases',
    label: '可见案例',
    value: formatNumber(visibleCaseCount.value),
    tag: `${formatNumber(caseList.value.length)} 个总数`,
    tagType: 'info',
    desc: '统计小程序端可展示的客户案例数量。',
    tone: 'info'
  },
  {
    key: 'risks',
    label: '待处理风险',
    value: formatNumber(riskCount.value),
    tag: riskCount.value ? '需要关注' : '状态正常',
    tagType: riskCount.value ? 'warning' : 'success',
    desc: '汇总缺少栏目案例和未绑定微信员工。',
    tone: riskCount.value ? 'warning' : 'success'
  }
])

const chartMaxValue = computed(() => Math.max(...chartData.value.values.map((item) => Number(item || 0)), 0))
const hasTrendData = computed(() => chartData.value.dates.length > 0 && chartData.value.values.length > 0)
const chartBars = computed(() => chartData.value.dates.map((date, index) => {
  const value = Number(chartData.value.values[index] || 0)
  const percent = chartMaxValue.value ? Math.max(8, Math.round((value / chartMaxValue.value) * 100)) : 0

  return {
    date,
    shortDate: formatShortDate(date),
    value,
    height: `${percent}%`
  }
}))

async function fetchDashboard() {
  const requestSeq = ++dashboardRequestSeq
  loading.value = true
  errorMessage.value = ''
  try {
    const statsParams = { timeRange: timeRange.value }
    if (companyId.value) statsParams.companyId = companyId.value

    const [stats, staff, cases] = await Promise.all([
      adminGetStats(statsParams),
      fetchAllStaff(),
      adminGetCaseList(companyId.value ? { companyId: companyId.value } : {})
    ])

    if (requestSeq !== dashboardRequestSeq) return

    const normalizedStats = normalizeStats(stats)

    overview.value = normalizedStats.overview
    chartData.value = normalizedStats.chart
    staffRank.value = normalizedStats.staffRank
      .sort((a, b) => (b.monthViews || 0) - (a.monthViews || 0))
      .slice(0, 5)
    staffList.value = staff
    caseList.value = cases.list || []
    lastUpdatedAt.value = formatDateTime(new Date())
  } catch (error) {
    if (requestSeq !== dashboardRequestSeq) return

    errorMessage.value = error?.message || '请检查网络、云函数或当前账号权限后重试。'
    ElMessage.error('运营驾驶舱数据加载失败')
  } finally {
    if (requestSeq === dashboardRequestSeq) {
      loading.value = false
    }
  }
}

async function fetchAllStaff() {
  const firstPage = await adminGetStaffList({ page: 1, pageSize: 200 })
  const firstList = firstPage.list || []
  const parsedTotal = Number(firstPage.total ?? firstList.length)
  const total = Number.isFinite(parsedTotal) ? parsedTotal : firstList.length
  const pageCount = Math.ceil(total / STAFF_PAGE_SIZE)

  if (pageCount <= 1) {
    return firstList
  }

  const restPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => adminGetStaffList({
      page: index + 2,
      pageSize: STAFF_PAGE_SIZE
    }))
  )

  return [
    ...firstList,
    ...restPages.flatMap((page) => page.list || [])
  ]
}

function normalizeStats(stats = {}) {
  const trend = Array.isArray(stats.trend) ? stats.trend : []
  const ranking = Array.isArray(stats.ranking) ? stats.ranking : []
  const staffRankSource = Array.isArray(stats.staffRank) && stats.staffRank.length
    ? stats.staffRank
    : ranking
  const chartDates = Array.isArray(stats.chart?.dates) && stats.chart.dates.length
    ? stats.chart.dates
    : trend.map((item) => item.date)
  const chartValues = Array.isArray(stats.chart?.values) && stats.chart.values.length
    ? stats.chart.values
    : trend.map((item) => item.count ?? 0)

  return {
    overview: {
      periodViews: stats.overview?.periodViews ?? stats.periodTotal ?? 0,
      totalViews: stats.overview?.totalViews ?? stats.allTimeTotal ?? 0,
      changePercent: stats.overview?.changePercent ?? null
    },
    chart: {
      dates: chartDates || [],
      values: chartValues || []
    },
    staffRank: staffRankSource.map((item) => ({
      ...item,
      monthViews: item.monthViews ?? item.views30d ?? 0,
      totalViews: item.totalViews ?? item.viewsTotal ?? 0
    }))
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatShortDate(value) {
  const parts = String(value || '').split('-')
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`
  return value || '-'
}

function getCompanyName(value) {
  return COMPANY_MAP[value] || '未知公司'
}

function getChangeText() {
  if (overview.value.changePercent === null) return '暂无环比'
  const prefix = overview.value.changePercent >= 0 ? '环比上升' : '环比下降'
  return `${prefix} ${Math.abs(overview.value.changePercent)}%`
}

function goTo(route) {
  router.push(route)
}

onMounted(() => {
  fetchDashboard()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
}

.dashboard-header {
  align-items: flex-start;
  margin-bottom: 0;
}

.dashboard-filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: $spacing-sm;
}

.dashboard-filter {
  width: 148px;
}

.dashboard-alert {
  border-radius: $radius-card;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: $spacing-base;
}

.metric-card {
  min-width: 0;
  padding: $spacing-base;
  background: $card-bg;
  border: 1px solid $border-color;
  border-top: 3px solid $color-primary;
  border-radius: $radius-card;

  &--success {
    border-top-color: $color-success;
  }

  &--warning {
    border-top-color: $color-warning;
  }

  &--info {
    border-top-color: #0369A1;
  }
}

.metric-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
}

.metric-card__label {
  color: $text-secondary;
  font-size: 13px;
  line-height: 20px;
}

.metric-card__value {
  margin-top: $spacing-sm;
  color: $text-primary;
  font-size: 28px;
  line-height: 36px;
  font-weight: 700;
}

.metric-card__desc {
  min-height: 40px;
  margin: $spacing-xs 0 0;
  color: $text-secondary;
  font-size: 13px;
  line-height: 20px;
}

.dashboard-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
  gap: $spacing-base;

  &--bottom {
    grid-template-columns: minmax(0, 1.25fr) minmax(340px, 0.75fr);
  }
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $spacing-base;
  margin-bottom: $spacing-base;
}

.panel-title {
  margin: 0;
  color: $text-primary;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.panel-desc {
  margin: $spacing-xs 0 0;
  color: $text-auxiliary;
  font-size: 13px;
  line-height: 20px;
}

.trend-panel {
  min-height: 340px;
}

.trend-chart {
  overflow-x: auto;
  padding: $spacing-sm 0 0;
}

.trend-chart__plot {
  display: flex;
  align-items: flex-end;
  gap: $spacing-sm;
  min-width: 520px;
  height: 250px;
  padding: $spacing-base $spacing-sm $spacing-sm;
  border: 1px solid $border-color;
  border-radius: $radius-card;
  background:
    linear-gradient(to top, $border-color 1px, transparent 1px) 0 0 / 100% 25%;
}

.trend-chart__bar-item {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 36px;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: $spacing-xs;
}

.trend-chart__value {
  color: $text-secondary;
  font-size: 12px;
  line-height: 16px;
}

.trend-chart__bar {
  width: 100%;
  max-width: 28px;
  min-height: 2px;
  border-radius: 6px 6px 0 0;
  background: $color-primary;
}

.trend-chart__date {
  color: $text-auxiliary;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.risk-list,
.operation-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.risk-item,
.operation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-base;
  padding: $spacing-md;
  border: 1px solid $border-color;
  border-radius: $radius-button;
  background: $table-header-bg;
}

.risk-item {
  border-left: 3px solid $color-primary;

  &--success {
    border-left-color: $color-success;
  }

  &--warning {
    border-left-color: $color-warning;
  }

  &--info {
    border-left-color: $color-primary;
  }
}

.risk-item__content {
  display: grid;
  gap: $spacing-xs;

  strong {
    color: $text-primary;
    font-size: 14px;
    line-height: 20px;
  }

  span {
    color: $text-auxiliary;
    font-size: 13px;
    line-height: 20px;
  }
}

.rank-index {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $surface-inset;
  color: $text-secondary;
  font-family: $font-family-number;
  font-weight: 600;
}

.staff-cell {
  display: grid;
  gap: 2px;

  strong {
    color: $text-primary;
    font-size: 14px;
    line-height: 20px;
  }

  span {
    color: $text-auxiliary;
    font-size: 12px;
    line-height: 18px;
  }
}

.operation-panel {
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
}

.operation-item {
  display: block;

  strong {
    display: block;
    margin-top: $spacing-xs;
    color: $text-primary;
    font-size: 14px;
    line-height: 20px;
  }

  p {
    margin: $spacing-xs 0 0;
    color: $text-auxiliary;
    font-size: 13px;
    line-height: 20px;
  }
}

.operation-item__label {
  color: $text-auxiliary;
  font-size: 12px;
  line-height: 18px;
}

@media (max-width: 1180px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-main-grid,
  .dashboard-main-grid--bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-header,
  .panel-header,
  .risk-item {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-filters,
  .dashboard-filter {
    width: 100%;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .metric-card__value {
    font-size: 24px;
    line-height: 32px;
  }
}
</style>
