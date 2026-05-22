# PC Admin Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 PC 管理端从基础后台升级为强数据驾驶舱式企业管理后台，同时保留现有 Vue、Element Plus、CloudBase 接口和业务链路。

**Architecture:** 先建立统一视觉 token、全局布局和路由入口，再新增运营驾驶舱页面，最后按模块改造登录、改密、内容中心、人员管理、公司管理、数据分析和关键弹窗状态。所有改动都落在现有 `admin/src` 真实页面和组件上，不另起平行实现。

**Tech Stack:** Vue 3 Composition API, Vue Router, Pinia, Element Plus, ECharts, TinyMCE, CloudBase JS SDK, SCSS.

---

## File Structure

- Modify: `admin/src/styles/variables.scss`  
  统一华悦 V2 设计 token：深色侧边栏、企业蓝、灰阶、圆角、边框、阴影。
- Modify: `admin/src/styles/global.scss`  
  统一 Element Plus 覆盖、页面工具类、表格、面板、状态提示。
- Modify: `admin/src/router/index.js`  
  新增 `/dashboard` 路由，根路径默认进入运营驾驶舱。
- Modify: `admin/src/layouts/AdminLayout.vue`  
  改为深色侧边栏、顶部栏、面包屑、帮助入口、退出确认。
- Create: `admin/src/views/dashboard/index.vue`  
  新增运营驾驶舱，组合 `adminGetStats`、`adminGetStaffList`、`adminGetCaseList`。
- Modify: `admin/src/views/login/index.vue`  
  登录页改为克制企业后台入口，说明账号安全规则。
- Modify: `admin/src/views/change-password/index.vue`  
  首次改密页改为统一安全页，说明密码要求和后续去向。
- Modify: `admin/src/views/cases/list.vue`  
  案例管理升级为内容中心，增加筛选、工具栏、风险状态和高风险确认文案。
- Modify: `admin/src/views/cases/edit.vue`  
  案例编辑改为主表单 + 右侧预览摘要，保留 TinyMCE 和栏目分组逻辑。
- Modify: `admin/src/views/staff/index.vue`  
  人员管理增加筛选区、工具栏、表格层级和导入/重置结果表达。
- Modify: `admin/src/components/StaffDrawer.vue`  
  员工编辑抽屉按新视觉整理，但不改字段和保存 payload。
- Modify: `admin/src/views/company/list.vue`  
  公司管理从卡片改为业务配置表。
- Modify: `admin/src/views/company/edit.vue`  
  公司编辑改为分组表单，统一富文本和定位提示。
- Modify: `admin/src/views/stats/index.vue`  
  数据统计升级为数据分析，补统计口径、数据来源、更新时间。

Do not modify CloudBase functions, database schema, or miniprogram pages in the first implementation pass.

---

### Task 1: Design Tokens And Global Shell Utilities

**Files:**
- Modify: `admin/src/styles/variables.scss`
- Modify: `admin/src/styles/global.scss`

- [ ] **Step 1: Replace design tokens in `variables.scss`**

Use the following token values. Keep variable names that existing pages already use, and add sidebar-specific tokens.

```scss
// --- 品牌色 ---
$color-primary: #2563EB;
$color-primary-hover: #1D4ED8;
$color-primary-pressed: #1E40AF;
$color-primary-soft: #EFF6FF;
$color-primary-border: #BFDBFE;
$color-success: #16A34A;
$color-warning: #D97706;
$color-error: #DC2626;
$color-purple: #7C3AED;

// --- 文字色 ---
$text-primary: #111827;
$text-secondary: #374151;
$text-regular: #374151;
$text-auxiliary: #6B7280;
$text-placeholder: #9CA3AF;
$text-disabled: #D1D5DB;

// --- 边框 / 背景 ---
$border-color: #E5E7EB;
$border-color-strong: #D1D5DB;
$page-bg: #F5F7FA;
$card-bg: #FFFFFF;
$table-header-bg: #F9FAFB;
$surface-inset: #F3F4F6;

// --- 侧边栏 ---
$sidebar-bg: #0F172A;
$sidebar-active-bg: #1E293B;
$sidebar-hover-bg: #1F2A3D;
$sidebar-text: #D1D5DB;
$sidebar-text-active: #FFFFFF;
$sidebar-border: rgba(255, 255, 255, 0.08);

// --- 圆角 ---
$radius-card: 8px;
$radius-button: 6px;
$radius-input: 6px;
$radius-tag: 999px;

// --- 间距 ---
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-base: 16px;
$spacing-lg: 20px;
$spacing-xl: 24px;
$spacing-xxl: 32px;

// --- 字体 ---
$font-family-base: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
$font-family-number: 'DIN Alternate', 'Roboto Mono', 'SFMono-Regular', Consolas, monospace;

// --- 阴影 ---
$shadow-card: none;
$shadow-dropdown: 0 12px 32px rgba(15, 23, 42, 0.14);

// --- 布局尺寸 ---
$header-height: 56px;
$sidebar-width: 232px;
$sidebar-collapsed-width: 64px;
```

- [ ] **Step 2: Update global Element Plus overrides**

In `global.scss`, keep existing imports and replace the Element Plus/card/page utility section with this structure.

```scss
html,
body {
  margin: 0;
  padding: 0;
  font-family: $font-family-base;
  font-size: 14px;
  color: $text-primary;
  background-color: $page-bg;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.el-button {
  border-radius: $radius-button;
  font-weight: 500;
}

.el-card {
  border-radius: $radius-card;
  box-shadow: none;
  border: 1px solid $border-color;
}

.el-table {
  --el-table-header-bg-color: #{$table-header-bg};
  --el-table-border-color: #{$border-color};
  --el-table-row-hover-bg-color: #{$table-header-bg};
}

.el-table th.el-table__cell {
  color: $text-auxiliary;
  font-weight: 600;
  font-size: 13px;
}

.el-table .cell {
  line-height: 1.45;
}

.page-container {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: $text-primary;
}

.page-desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: $text-auxiliary;
}

.card-wrapper,
.admin-panel {
  background: $card-bg;
  border: 1px solid $border-color;
  border-radius: $radius-card;
  box-shadow: none;
  padding: $spacing-base;
}

.admin-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: $card-bg;
  border: 1px solid $border-color;
  border-bottom: none;
  border-radius: $radius-card $radius-card 0 0;
  color: $text-auxiliary;
  font-size: 13px;
}

.admin-filter-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: $card-bg;
  border: 1px solid $border-color;
  border-radius: $radius-card;
}

.text-muted {
  color: $text-auxiliary;
  font-size: 13px;
}

.num-cell {
  font-family: $font-family-number;
  font-weight: 500;
}
```

- [ ] **Step 3: Run build**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
```

Expected: Vite build completes successfully.

- [ ] **Step 4: Commit foundation styles**

```powershell
git add admin/src/styles/variables.scss admin/src/styles/global.scss
git commit -m "style: update admin design tokens"
```

---

### Task 2: Router And Admin Layout

**Files:**
- Modify: `admin/src/router/index.js`
- Modify: `admin/src/layouts/AdminLayout.vue`

- [ ] **Step 1: Add dashboard route and default redirect**

In `admin/src/router/index.js`, change the root redirect to `/dashboard` and add the route before `staff`.

```js
{
  path: '/',
  component: () => import('@/layouts/AdminLayout.vue'),
  redirect: '/dashboard',
  children: [
    {
      path: 'dashboard',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/index.vue'),
      meta: { title: '运营驾驶舱' }
    },
    {
      path: 'staff',
      name: 'Staff',
      component: () => import('@/views/staff/index.vue'),
      meta: { title: '人员管理' }
    }
  ]
}
```

Keep existing company/cases/stats routes after the new dashboard route. Rename route meta titles:

```js
meta: { title: '内容中心' } // cases list
meta: { title: '数据分析' } // stats
```

- [ ] **Step 2: Update post-login destination copy**

In `login/index.vue` and `change-password/index.vue`, later tasks will still route to `/`. Because `/` now redirects to `/dashboard`, no extra login routing change is needed.

- [ ] **Step 3: Replace layout menu definitions**

In `AdminLayout.vue`, define menu items in script:

```js
const menuItems = [
  { index: '/dashboard', label: '运营驾驶舱', icon: DataLine },
  { index: '/cases', label: '内容中心', icon: Suitcase },
  { index: '/staff', label: '人员管理', icon: User },
  { index: '/company', label: '公司管理', icon: OfficeBuilding },
  { index: '/stats', label: '数据分析', icon: DataAnalysis }
]
```

Use `DataLine` from `@element-plus/icons-vue`.

- [ ] **Step 4: Update `activeMenu` fallback**

```js
const activeMenu = computed(() => {
  const path = route.path
  const match = path.match(/^\/[^/]+/)
  return match ? match[0] : '/dashboard'
})
```

- [ ] **Step 5: Replace layout visual structure**

Use the existing `el-container`, but change sidebar and menu colors:

```vue
<el-aside :width="sidebarCollapsed ? '64px' : '232px'" class="admin-sidebar">
  <div class="sidebar-logo" @click="router.push('/dashboard')">
    <div class="logo-mark">名</div>
    <span v-show="!sidebarCollapsed" class="logo-text">电子名片后台</span>
  </div>
  <div v-show="!sidebarCollapsed" class="sidebar-group-label">业务总览</div>
  <el-menu
    :default-active="activeMenu"
    :collapse="sidebarCollapsed"
    router
    class="sidebar-menu"
    background-color="#0F172A"
    text-color="#D1D5DB"
    active-text-color="#FFFFFF"
  >
    <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
      <el-icon><component :is="item.icon" /></el-icon>
      <template #title>{{ item.label }}</template>
    </el-menu-item>
  </el-menu>
</el-aside>
```

Topbar keeps collapse, title, user name, and logout. Add current page title:

```vue
<span class="header-title">{{ route.meta.title || '运营驾驶舱' }}</span>
```

- [ ] **Step 6: Replace layout SCSS**

Use sidebar tokens from `variables.scss`: `$sidebar-bg`, `$sidebar-active-bg`, `$sidebar-hover-bg`, `$sidebar-text`, `$sidebar-border`.

Expected visual result:

- Left sidebar dark.
- Active item has `#1E293B` background.
- Header remains 56px white.
- Main area is `#F5F7FA` with `20px 24px 28px` padding.

- [ ] **Step 7: Build**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
```

Expected: build passes and dashboard route import fails only if Task 3 has not created the file. If running Task 2 before Task 3, temporarily create `admin/src/views/dashboard/index.vue` with:

```vue
<template><div class="page-container">运营驾驶舱</div></template>
```

- [ ] **Step 8: Commit router and layout**

```powershell
git add admin/src/router/index.js admin/src/layouts/AdminLayout.vue admin/src/views/dashboard/index.vue
git commit -m "feat: add admin dashboard shell"
```

---

### Task 3: Operational Dashboard Page

**Files:**
- Create/Modify: `admin/src/views/dashboard/index.vue`

- [ ] **Step 1: Create dashboard page state and fetch logic**

Use current APIs only:

```js
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
```

Fetch:

```js
async function fetchDashboard() {
  loading.value = true
  try {
    const statsParams = { timeRange: timeRange.value }
    if (companyId.value) statsParams.companyId = companyId.value

    const [stats, staff, cases] = await Promise.all([
      adminGetStats(statsParams),
      adminGetStaffList({ page: 1, pageSize: 200 }),
      adminGetCaseList(companyId.value ? { companyId: companyId.value } : {})
    ])

    overview.value = {
      periodViews: stats.overview?.periodViews ?? 0,
      totalViews: stats.overview?.totalViews ?? 0,
      changePercent: stats.overview?.changePercent ?? null
    }
    chartData.value = {
      dates: stats.chart?.dates || [],
      values: stats.chart?.values || []
    }
    staffRank.value = [...(stats.staffRank || [])].sort((a, b) => (b.monthViews || 0) - (a.monthViews || 0)).slice(0, 5)
    staffList.value = staff.list || []
    caseList.value = cases.list || []
    lastUpdatedAt.value = formatDateTime(new Date())
  } finally {
    loading.value = false
  }
}
```

Helper functions:

```js
function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
```

- [ ] **Step 2: Add dashboard computed risk data**

```js
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
```

- [ ] **Step 3: Build dashboard template**

Use these sections:

- page header with company and time range filters
- four metric cards
- trend panel using lightweight CSS chart or existing ECharts
- risk list
- staff rank table
- recent operation panel with fixed explanatory copy: `最近操作展示当前后台可追溯动作；第一版不新增操作日志接口`

Metric card labels:

```txt
期间浏览量
活跃员工
可见案例
待处理风险
```

Each metric card must include `来源 / 口径 / 更新时间` text.

- [ ] **Step 4: Add dashboard empty/error UI**

When `staffList`, `caseList`, or `chartData` is empty, show persistent page content:

```vue
<el-empty v-if="!loading && !caseList.length" description="暂无案例数据，可先进入内容中心新建案例。" />
```

Do not rely only on `ElMessage`.

- [ ] **Step 5: Build**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
```

Expected: build passes.

- [ ] **Step 6: Commit dashboard**

```powershell
git add admin/src/views/dashboard/index.vue
git commit -m "feat: build admin operational dashboard"
```

---

### Task 4: Login And Change Password Redesign

**Files:**
- Modify: `admin/src/views/login/index.vue`
- Modify: `admin/src/views/change-password/index.vue`

- [ ] **Step 1: Replace login copy**

Keep current login logic and validation. Change visible text:

```txt
电子名片管理后台
请使用管理员手机号和密码登录
PC 后台仅支持管理员进入。连续输错多次后可能临时锁定，请联系主管理员处理。
```

Keep `handlePasswordLogin`, `normalizeAdminInfo`, `finishLogin` unchanged.

- [ ] **Step 2: Replace login visual layout**

Use a centered white card on `#F5F7FA`, not a blue/purple marketing gradient. Card width 420-460px. Add a slim left brand mark only if it does not create a marketing hero.

SCSS requirements:

```scss
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $page-bg;
  padding: 24px;
}

.login-card {
  width: 440px;
  max-width: 100%;
  background: $card-bg;
  border: 1px solid $border-color;
  border-radius: 12px;
  box-shadow: none;
  padding: 28px;
}
```

- [ ] **Step 3: Replace change-password visual layout**

Keep `handleSubmit` and `handleLogout` logic. Use same card style as login. Add persistent info alert:

```txt
修改成功后会进入运营驾驶舱。新密码需为 8-20 位，且必须同时包含字母和数字。
```

- [ ] **Step 4: Build**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
```

Expected: build passes.

- [ ] **Step 5: Commit auth pages**

```powershell
git add admin/src/views/login/index.vue admin/src/views/change-password/index.vue
git commit -m "style: redesign admin auth pages"
```

---

### Task 5: Content Center Case List

**Files:**
- Modify: `admin/src/views/cases/list.vue`

- [ ] **Step 1: Rename page title and add description**

Change header:

```vue
<div class="title-block">
  <h1 class="page-title">内容中心</h1>
  <p class="page-desc">管理客户案例、栏目、可见状态和小程序端展示内容。</p>
</div>
```

- [ ] **Step 2: Add filter state**

Add:

```js
const keyword = ref('')
const visibleStatus = ref('')
const categoryStatus = ref('')
```

Add computed list:

```js
const filteredCaseList = computed(() => {
  return caseList.value.filter((item) => {
    const keywordMatched = !keyword.value || String(item.title || '').includes(keyword.value.trim())
    const visibleMatched =
      !visibleStatus.value ||
      (visibleStatus.value === 'visible' && item.visible !== false) ||
      (visibleStatus.value === 'hidden' && item.visible === false)
    const categoryMatched =
      !categoryStatus.value ||
      (categoryStatus.value === 'missing' && !item.categories?.length) ||
      (categoryStatus.value === 'hasCategory' && !!item.categories?.length)
    return keywordMatched && visibleMatched && categoryMatched
  })
})
```

Use `filteredCaseList` as table data.

- [ ] **Step 3: Add filter panel**

Place below `CompanyTabs`:

```vue
<div class="admin-filter-panel">
  <el-input v-model="keyword" clearable placeholder="搜索企业全称" style="width: 220px" />
  <el-select v-model="visibleStatus" clearable placeholder="可见状态" style="width: 140px">
    <el-option label="可见" value="visible" />
    <el-option label="隐藏" value="hidden" />
  </el-select>
  <el-select v-model="categoryStatus" clearable placeholder="栏目状态" style="width: 140px">
    <el-option label="已有栏目" value="hasCategory" />
    <el-option label="缺少栏目" value="missing" />
  </el-select>
  <el-button @click="handleResetFilters">重置</el-button>
</div>
```

Add:

```js
function handleResetFilters() {
  keyword.value = ''
  visibleStatus.value = ''
  categoryStatus.value = ''
}
```

- [ ] **Step 4: Add toolbar**

Before table:

```vue
<div class="admin-toolbar">
  <span>共 {{ filteredCaseList.length }} 条 · 返回本页保留当前筛选条件</span>
  <div class="toolbar-actions">
    <el-button plain size="small" @click="categoryDialogVisible = true">栏目管理</el-button>
  </div>
</div>
```

- [ ] **Step 5: Improve delete confirmation copy**

Replace delete confirm text with:

```js
await ElMessageBox.confirm(
  `确认删除案例「${row.title}」吗？删除后该案例不会在小程序展示，后台不可直接恢复。本操作会记录操作人和时间。`,
  '删除案例确认',
  { confirmButtonText: '确认删除案例', cancelButtonText: '取消', type: 'warning' }
)
```

- [ ] **Step 6: Build**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
```

Expected: build passes.

- [ ] **Step 7: Commit content center list**

```powershell
git add admin/src/views/cases/list.vue
git commit -m "feat: redesign case content center"
```

---

### Task 6: Case Edit Page

**Files:**
- Modify: `admin/src/views/cases/edit.vue`

- [ ] **Step 1: Keep business logic unchanged**

Do not change:

- `form` fields
- `rules`
- `watch(() => form.companyIds, ...)`
- `handleSave`
- `resolvePreviewContent`
- `normalizePreviewDocument`

- [ ] **Step 2: Change layout to main form plus side preview**

Wrap current form card and preview summary:

```vue
<div class="case-edit-layout">
  <div class="case-edit-main">
    <!-- existing form -->
  </div>
  <aside class="case-edit-preview">
    <div class="preview-cover-card">
      <img v-if="previewCoverUrl" :src="previewCoverUrl" alt="案例封面预览">
      <div v-else class="preview-cover-placeholder">暂无封面图</div>
    </div>
    <h3>{{ form.title || '未填写企业全称' }}</h3>
    <p>{{ form.description || '暂无简要描述' }}</p>
    <div class="preview-meta">
      <el-tag v-for="name in previewCategoryNames" :key="name" effect="plain">{{ name }}</el-tag>
    </div>
  </aside>
</div>
```

- [ ] **Step 3: Add unsaved state hint**

Add a non-blocking hint in page header:

```vue
<span class="text-muted">保存前请先预览小程序展示效果</span>
```

Do not implement auto-save in this pass.

- [ ] **Step 4: Add responsive SCSS**

```scss
.case-edit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.case-edit-preview {
  position: sticky;
  top: 16px;
  border: 1px solid $border-color;
  border-radius: $radius-card;
  background: $card-bg;
  padding: 16px;
}

@media (max-width: 1100px) {
  .case-edit-layout {
    grid-template-columns: 1fr;
  }

  .case-edit-preview {
    position: static;
  }
}
```

- [ ] **Step 5: Build and commit**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
git add admin/src/views/cases/edit.vue
git commit -m "style: redesign case edit workspace"
```

Expected: build passes.

---

### Task 7: Staff Management And Staff Drawer

**Files:**
- Modify: `admin/src/views/staff/index.vue`
- Modify: `admin/src/components/StaffDrawer.vue`

- [ ] **Step 1: Add staff list filters**

Add:

```js
const keyword = ref('')
const statusFilter = ref('')
const bindingFilter = ref('')
```

Add computed list:

```js
const filteredStaffList = computed(() => {
  const text = keyword.value.trim()
  return staffList.value.filter((item) => {
    const keywordMatched = !text || [item.name, item.phone, item.secondPhone].some((value) => String(value || '').includes(text))
    const statusMatched = !statusFilter.value || item.status === statusFilter.value
    const bindingMatched =
      !bindingFilter.value ||
      (bindingFilter.value === 'bound' && item.isBound) ||
      (bindingFilter.value === 'unbound' && !item.isBound)
    return keywordMatched && statusMatched && bindingMatched
  })
})
```

Use `filteredStaffList` as table data.

- [ ] **Step 2: Add filter panel and toolbar**

Use:

```vue
<div class="admin-filter-panel">
  <el-input v-model="keyword" clearable placeholder="搜索姓名或手机号" style="width: 220px" />
  <el-select v-model="statusFilter" clearable placeholder="账号状态" style="width: 140px">
    <el-option label="正常" value="active" />
    <el-option label="已停用" value="disabled" />
  </el-select>
  <el-select v-model="bindingFilter" clearable placeholder="绑定状态" style="width: 140px">
    <el-option label="已绑定" value="bound" />
    <el-option label="未绑定" value="unbound" />
  </el-select>
  <el-button @click="keyword = ''; statusFilter = ''; bindingFilter = ''">重置</el-button>
</div>
```

Toolbar:

```vue
<div class="admin-toolbar">
  <span>共 {{ filteredStaffList.length }} 名员工 · 批量导入前请先下载模板</span>
  <span class="text-muted">密码和绑定状态只用于后台管理</span>
</div>
```

- [ ] **Step 3: Improve high-risk confirmation copy**

Reset password confirm:

```js
`确认重置员工“${row.name}”的登录密码？重置后旧密码会立即失效，需要把新临时密码发给本人。`
```

Delete confirm:

```js
`确认彻底删除员工“${row.name}”吗？删除后该员工将无法登录，员工资料会从后台员工表移除。本操作不可直接恢复。`
```

- [ ] **Step 4: Restyle import result summary**

Change summary cards to 8px radius, border, no shadow. Use success and danger semantic colors from variables.

- [ ] **Step 5: Restyle `StaffDrawer.vue` panels**

Change nested panels to 8px radius and `#F3F4F6` inset background. Keep all save payload and validation unchanged.

- [ ] **Step 6: Build and commit**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
git add admin/src/views/staff/index.vue admin/src/components/StaffDrawer.vue
git commit -m "feat: redesign staff management"
```

Expected: build passes.

---

### Task 8: Company Management And Company Edit

**Files:**
- Modify: `admin/src/views/company/list.vue`
- Modify: `admin/src/views/company/edit.vue`

- [ ] **Step 1: Replace company card grid with table**

Use `el-table` over `companyList`.

Columns:

- 公司
- 资料完整度
- 定位
- 联系电话
- 更新时间
- 操作

Completeness helper:

```js
function getCompanyCompleteness(company) {
  const missing = []
  if (!company.intro) missing.push('公司简介')
  if (!company.businessIntro) missing.push('业务介绍')
  if (!company.logo) missing.push('Logo')
  if (!company.address) missing.push('地址')
  if (!company.phone) missing.push('电话')
  return {
    complete: missing.length === 0,
    missing
  }
}
```

- [ ] **Step 2: Add company management toolbar**

```vue
<div class="admin-toolbar">
  <span>固定 3 家公司 · 公司资料会影响小程序客户首页展示</span>
  <span class="text-muted">编辑后请在小程序端人工核对展示效果</span>
</div>
```

- [ ] **Step 3: Restyle company edit**

Keep all fields and `handleSave` unchanged. Change layout to:

- page header with return and save buttons
- white bordered panel
- grouped form sections:
  - 基础资料
  - 展示内容
  - 联系方式与定位

Use `label-position="top"` for consistency.

- [ ] **Step 4: Build and commit**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
git add admin/src/views/company/list.vue admin/src/views/company/edit.vue
git commit -m "feat: redesign company management"
```

Expected: build passes.

---

### Task 9: Data Analysis Page

**Files:**
- Modify: `admin/src/views/stats/index.vue`

- [ ] **Step 1: Rename page title and add data trust alert**

Title:

```txt
数据分析
```

Alert text:

```txt
统计口径：只统计外部访客打开名片产生的 card_view 日志；已登录员工访问不计入。数据更新时间以当前页面刷新完成时间为准。
```

- [ ] **Step 2: Add `lastUpdatedAt`**

```js
const lastUpdatedAt = ref('')

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
```

Set after successful fetch:

```js
lastUpdatedAt.value = formatDateTime(new Date())
```

- [ ] **Step 3: Add third metric card**

Add `高活跃员工`:

```js
const activeRankCount = computed(() => rankList.value.filter((item) => Number(item.monthViews || 0) >= 500).length)
```

Metric label:

```txt
近30天浏览量 ≥ 500 的启用员工
```

- [ ] **Step 4: Remove emoji medals**

Replace medal emoji with plain numeric rank. This keeps the enterprise UI restrained and avoids inconsistent emoji rendering.

- [ ] **Step 5: Build and commit**

Run:

```powershell
cmd /c npm.cmd --prefix admin run build
git add admin/src/views/stats/index.vue
git commit -m "feat: redesign admin data analysis"
```

Expected: build passes.

---

### Task 10: Final Verification

**Files:**
- Read-only verification across `admin/src`.

- [ ] **Step 1: Run production build**

```powershell
cmd /c npm.cmd --prefix admin run build
```

Expected: Vite build completes successfully.

- [ ] **Step 2: Start local dev server**

Use a hidden process or a persistent terminal:

```powershell
cmd /c npm.cmd --prefix admin run dev -- --host 127.0.0.1 --port 3000
```

Expected: dev server serves `http://127.0.0.1:3000/`.

- [ ] **Step 3: Browser smoke check with Edge DOM dump**

Run:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu --no-sandbox --disable-crash-reporter --disable-breakpad --user-data-dir='E:\Codex\微信名片\.superpowers\edge-profile\admin-smoke' --window-size=1440,1100 --dump-dom 'http://127.0.0.1:3000/#/login'
```

Expected DOM contains:

```txt
电子名片管理后台
管理员登录
```

- [ ] **Step 4: Manual route smoke with authenticated app**

Because real admin login requires valid CloudBase credentials, ask the user to perform real login after Codex build verification. Required manual checks:

- Login succeeds and redirects to `/#/dashboard`.
- Sidebar shows: 运营驾驶舱、内容中心、人员管理、公司管理、数据分析。
- Content center list opens and case preview still works.
- Case edit saves existing data without changing rich text rendering.
- Staff drawer opens and save payload behaves as before.
- Company edit saves and小程序端展示正常.
- Data analysis switches company and time range.

- [ ] **Step 5: Final status**

Report:

- Build command and result.
- Browser smoke check result.
- Any verification not completed and why.
- Manual checks the user must run.

Do not update PRD or technical solution docs until the user confirms the actual program changes solve the issue.
