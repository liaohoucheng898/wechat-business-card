<template>
  <div class="staff-page">
    <div class="page-header">
      <span class="page-title">员工管理</span>
      <div class="header-actions">
        <el-button class="header-action-btn" type="primary" plain @click="openImportDialog">
          导入员工
        </el-button>
        <el-button class="header-action-btn" type="primary" @click="openDrawer()">
          <el-icon><Plus /></el-icon>
          新增员工
        </el-button>
      </div>
    </div>

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

    <div class="admin-toolbar">
      <span>共 {{ filteredStaffList.length }} 名员工 · 批量导入前请先下载模板</span>
      <span class="text-muted">密码和绑定状态只用于后台管理</span>
    </div>

    <div class="card-wrapper">
      <el-table :data="filteredStaffList" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />

        <el-table-column label="头像" width="70" align="center">
          <template #default="{ row }">
            <el-avatar :size="36" :src="row.avatar" />
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" width="100" />

        <el-table-column label="手机号" width="220">
          <template #default="{ row }">
            {{ formatPhoneDisplay(row) }}
          </template>
        </el-table-column>

        <el-table-column label="已绑微信数" width="100" align="center">
          <template #default="{ row }">
            {{ row.boundWechatCount || 0 }}
          </template>
        </el-table-column>

        <el-table-column label="是否管理员" width="100" align="center">
          <template #default="{ row }">
            {{ row.isAdmin ? '是' : '否' }}
          </template>
        </el-table-column>

        <el-table-column label="华悦职位" min-width="120">
          <template #default="{ row }">
            {{ row.huayueTitle || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="华宝职位" min-width="120">
          <template #default="{ row }">
            {{ row.huabaoTitle || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="卓辰职位" min-width="120">
          <template #default="{ row }">
            {{ row.zhuochenTitle || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="已开通公司" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="item in row.enabledCompanies"
              :key="item.companyId"
              size="small"
              class="company-tag"
            >
              {{ getCompanyName(item.companyId) }}
            </el-tag>
            <span v-if="!row.enabledCompanies?.length" class="text-muted">暂无</span>
          </template>
        </el-table-column>

        <el-table-column label="绑定状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.isBound ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ row.isBound ? '已绑定' : '未绑定' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="密码状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getPasswordStatusType(row.passwordStatus)"
              size="small"
              effect="plain"
            >
              {{ getPasswordStatusLabel(row.passwordStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="账号状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'active' ? 'success' : 'danger'"
              size="small"
              effect="plain"
            >
              {{ row.status === 'active' ? '正常' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleResetPassword(row)">
              重置密码
            </el-button>
            <el-button type="primary" link size="small" @click="openDrawer(row)">
              编辑
            </el-button>
            <el-button
              :type="row.status === 'active' ? 'info' : 'success'"
              link
              size="small"
              @click="handleToggle(row)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <StaffDrawer
      v-model:visible="drawerVisible"
      :staff-data="editingStaff"
      @saved="onSaved"
      @refresh="fetchList"
    />

    <input
      ref="importInputRef"
      class="hidden-file-input"
      type="file"
      accept=".xlsx,.xls"
      @change="handleImportFileChange"
    >

    <el-dialog
      v-model="importDialogVisible"
      title="导入员工"
      width="520px"
      destroy-on-close
      @closed="resetImportDialog"
    >
      <div class="import-dialog">
        <div class="import-dialog__section">
          <p class="import-dialog__label">模板说明</p>
          <p class="import-dialog__text">模板字段：姓名、手机号、华悦职位、华宝职位。</p>
          <p class="import-dialog__text">只要填写了某个公司的职位，系统就会自动开通这个公司。</p>
          <p class="import-dialog__text">如果两个职位都没填，这一行会导入失败。</p>
          <p class="import-dialog__text">如员工后续需要进入小程序，请在员工列表里单独重置密码后再发给他。</p>
          <el-button type="primary" plain @click="downloadImportTemplate">
            下载模板
          </el-button>
        </div>

        <div class="import-dialog__section">
          <p class="import-dialog__label">上传 Excel</p>
          <div class="import-upload">
            <el-button @click="triggerImportFileSelect">选择文件</el-button>
            <span class="import-upload__name">{{ importFileName || '未选择文件' }}</span>
          </div>
          <p class="import-dialog__hint">仅支持 .xlsx / .xls 文件，单个文件不超过 5MB，最多导入 5000 条</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="submitImport">
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="importResultDialogVisible"
      title="导入结果"
      width="640px"
      destroy-on-close
    >
      <div class="import-result">
        <div class="import-result__summary">
          <div class="summary-card">
            <span class="summary-card__label">总记录数</span>
            <strong class="summary-card__value">{{ importResult.total }}</strong>
          </div>
          <div class="summary-card summary-card--success">
            <span class="summary-card__label">成功导入</span>
            <strong class="summary-card__value success">{{ importResult.successCount }}</strong>
          </div>
          <div class="summary-card summary-card--danger">
            <span class="summary-card__label">失败条数</span>
            <strong class="summary-card__value danger">{{ importResult.failCount }}</strong>
          </div>
        </div>

        <div v-if="importResult.failures.length" class="import-result__table">
          <p class="import-dialog__label">失败明细</p>
          <el-table :data="importResult.failures" stripe max-height="300">
            <el-table-column prop="rowNumber" label="Excel行号" width="100" align="center" />
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="phone" label="手机号" min-width="140" />
            <el-table-column prop="reason" label="失败原因" min-width="180" />
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="importResultDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="credentialDialogVisible"
      title="账号信息"
      width="420px"
      destroy-on-close
    >
      <div class="credential-dialog">
        <p class="credential-tip">{{ credentialDialog.tip }}</p>

        <div class="credential-field">
          <span class="credential-label">账号</span>
          <el-input :model-value="credentialDialog.phone" readonly />
        </div>

        <div class="credential-field">
          <span class="credential-label">密码</span>
          <el-input :model-value="credentialDialog.temporaryPassword" readonly />
        </div>

        <p class="credential-note">请把这组账号和密码发给对应员工，员工首次打开小程序时输入账号和密码后会自动绑定当前微信，后续直接通过微信进入。</p>
      </div>

      <template #footer>
        <el-button @click="credentialDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyPassword">复制密码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import * as XLSX from '@e965/xlsx'
import { adminDeleteStaff, adminGetStaffList, adminImportStaff, adminResetPassword, adminToggleStaff } from '@/cloud/api'
import { COMPANY_MAP } from '@/config/env'
import StaffDrawer from '@/components/StaffDrawer.vue'
import { useUserStore } from '@/stores/user'

const IMPORT_HEADERS = ['姓名', '手机号', '华悦职位', '华宝职位']
const IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024
const IMPORT_MAX_ROWS = 5000
const IMPORT_BATCH_SIZE = 500
const IMPORT_FIELD_LIMITS = {
  name: 20,
  phone: 11,
  huayueTitle: 30,
  huabaoTitle: 30
}
const FORMULA_PREFIX_RE = /^[=+\-@]/

const loading = ref(false)
const staffList = ref([])
const drawerVisible = ref(false)
const editingStaff = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const statusFilter = ref('')
const bindingFilter = ref('')
const credentialDialogVisible = ref(false)
const credentialDialog = ref({
  phone: '',
  temporaryPassword: '',
  tip: ''
})
const importDialogVisible = ref(false)
const importResultDialogVisible = ref(false)
const importLoading = ref(false)
const importInputRef = ref(null)
const importFileName = ref('')
const importRows = ref([])
const importResult = ref({
  total: 0,
  successCount: 0,
  failCount: 0,
  failures: []
})
const userStore = useUserStore()

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

function getCompanyName(companyId) {
  return COMPANY_MAP[companyId] || companyId
}

function getPasswordStatusLabel(status) {
  if (status === 'temporary') return '临时密码'
  if (status === 'active') return '已设置'
  return '未设置'
}

function getPasswordStatusType(status) {
  if (status === 'temporary') return 'warning'
  if (status === 'active') return 'success'
  return 'info'
}

function formatPhoneDisplay(row) {
  if (!row) return ''
  if (row.secondPhone) {
    return `${row.phone} / ${row.secondPhone}`
  }
  return row.phone || ''
}

function openImportDialog() {
  importDialogVisible.value = true
}

function resetImportDialog() {
  importLoading.value = false
  importFileName.value = ''
  importRows.value = []
  if (importInputRef.value) {
    importInputRef.value.value = ''
  }
}

function triggerImportFileSelect() {
  importInputRef.value?.click()
}

function normalizeCellValue(value) {
  return String(value ?? '').trim()
}

function formatFileSize(size) {
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

function assertImportFileAllowed(file) {
  if (!/\.(xlsx|xls)$/i.test(file.name || '')) {
    throw new Error('仅支持 .xlsx / .xls 文件')
  }
  if (file.size > IMPORT_MAX_FILE_SIZE) {
    throw new Error(`Excel 文件不能超过 ${formatFileSize(IMPORT_MAX_FILE_SIZE)}`)
  }
}

function hasFormulaPrefix(value = '') {
  return FORMULA_PREFIX_RE.test(String(value || '').trim())
}

function assertNoImportFormulas(sheet) {
  const formulaCell = Object.keys(sheet || {}).find((cell) => {
    return !cell.startsWith('!') && sheet[cell] && sheet[cell].f
  })
  if (formulaCell) {
    throw new Error('Excel 中不能包含公式，请粘贴为普通文本后再导入')
  }
}

function assertImportSheetAllowed(sheet) {
  if (!sheet || !sheet['!ref']) {
    throw new Error('Excel 中没有可读取的数据')
  }

  const range = XLSX.utils.decode_range(sheet['!ref'])
  const dataRowCount = Math.max(range.e.r - range.s.r, 0)
  if (dataRowCount > IMPORT_MAX_ROWS) {
    throw new Error(`单次最多导入 ${IMPORT_MAX_ROWS} 条员工数据`)
  }

  assertNoImportFormulas(sheet)
}

function assertImportFieldSafety(row, rowNumber) {
  const fields = [
    { label: '姓名', value: row.name, max: IMPORT_FIELD_LIMITS.name },
    { label: '手机号', value: row.phone, max: IMPORT_FIELD_LIMITS.phone },
    { label: '华悦职位', value: row.huayueTitle, max: IMPORT_FIELD_LIMITS.huayueTitle },
    { label: '华宝职位', value: row.huabaoTitle, max: IMPORT_FIELD_LIMITS.huabaoTitle }
  ]

  fields.forEach((field) => {
    if (field.value.length > field.max) {
      throw new Error(`第 ${rowNumber} 行${field.label}不能超过 ${field.max} 个字`)
    }
    if (hasFormulaPrefix(field.value)) {
      throw new Error(`第 ${rowNumber} 行${field.label}不能以公式或特殊符号开头`)
    }
  })
}

function assertNoDuplicatePhones(rows = []) {
  const seen = new Map()
  rows.forEach((row) => {
    if (!row.phone) return
    if (seen.has(row.phone)) {
      throw new Error(`Excel 中手机号重复：第 ${seen.get(row.phone)} 行和第 ${row.rowNumber} 行`)
    }
    seen.set(row.phone, row.rowNumber)
  })
}

function parseImportRows(sheetRows = []) {
  if (!sheetRows.length) {
    throw new Error('Excel 内容为空，请先按模板填写后再导入')
  }

  const headerRow = (sheetRows[0] || []).map((item) => normalizeCellValue(item))
  const nameIndex = headerRow.indexOf('姓名')
  const phoneIndex = headerRow.indexOf('手机号')
  const huayueTitleIndex = headerRow.indexOf('华悦职位')
  const huabaoTitleIndex = headerRow.indexOf('华宝职位')

  if (
    nameIndex === -1 ||
    phoneIndex === -1 ||
    huayueTitleIndex === -1 ||
    huabaoTitleIndex === -1
  ) {
    throw new Error('模板表头不正确，请先下载模板后再填写')
  }

  const rows = []

  sheetRows.slice(1).forEach((row = [], index) => {
    const rowNumber = index + 2
    const name = normalizeCellValue(row[nameIndex])
    const phone = normalizeCellValue(row[phoneIndex]).replace(/\s+/g, '')
    const huayueTitle = normalizeCellValue(row[huayueTitleIndex])
    const huabaoTitle = normalizeCellValue(row[huabaoTitleIndex])

    if (!name && !phone && !huayueTitle && !huabaoTitle) {
      return
    }

    const importRow = {
      rowNumber,
      name,
      phone,
      huayueTitle,
      huabaoTitle
    }
    assertImportFieldSafety(importRow, rowNumber)

    if (rows.length >= IMPORT_MAX_ROWS) {
      throw new Error(`单次最多导入 ${IMPORT_MAX_ROWS} 条员工数据`)
    }

    rows.push(importRow)
  })

  if (!rows.length) {
    throw new Error('Excel 中没有可导入的数据')
  }

  assertNoDuplicatePhones(rows)

  return rows
}

function chunkRows(rows = [], size = IMPORT_BATCH_SIZE) {
  const batches = []
  for (let index = 0; index < rows.length; index += size) {
    batches.push(rows.slice(index, index + size))
  }
  return batches
}

async function importStaffInBatches(rows = []) {
  const batches = chunkRows(rows)
  const summary = {
    total: rows.length,
    successCount: 0,
    failCount: 0,
    failures: []
  }

  for (let index = 0; index < batches.length; index += 1) {
    const result = await adminImportStaff(batches[index])
    const failures = Array.isArray(result.failures) ? result.failures : []
    summary.successCount += Number(result.successCount || 0)
    summary.failCount += Number(result.failCount || failures.length || 0)
    summary.failures.push(...failures)
  }

  return summary
}

async function handleImportFileChange(event) {
  const [file] = event.target.files || []
  if (!file) {
    return
  }

  try {
    assertImportFileAllowed(file)

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error('Excel 中没有工作表，请检查文件内容')
    }

    const sheet = workbook.Sheets[firstSheetName]
    assertImportSheetAllowed(sheet)

    const sheetRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: ''
    })

    const rows = parseImportRows(sheetRows)
    importRows.value = rows
    importFileName.value = file.name
    ElMessage.success(`已读取 ${rows.length} 条记录`)
  } catch (error) {
    importRows.value = []
    importFileName.value = ''
    ElMessage.error(error.message || 'Excel 解析失败，请检查文件内容')
  } finally {
    if (importInputRef.value) {
      importInputRef.value.value = ''
    }
  }
}

function downloadImportTemplate() {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS])
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 }
  ]
  XLSX.utils.book_append_sheet(workbook, worksheet, '员工导入模板')
  XLSX.writeFile(workbook, '员工导入模板.xlsx')
}

async function submitImport() {
  if (!importRows.value.length) {
    ElMessage.warning('请先选择需要导入的 Excel 文件')
    return
  }

  importLoading.value = true
  try {
    const result = await importStaffInBatches(importRows.value)
    importResult.value = {
      total: result.total || 0,
      successCount: result.successCount || 0,
      failCount: result.failCount || 0,
      failures: result.failures || []
    }

    importDialogVisible.value = false
    importResultDialogVisible.value = true
    fetchList()

    ElMessage.success(
      `本次共导入 ${importResult.value.total} 条，成功导入 ${importResult.value.successCount} 条，失败 ${importResult.value.failCount} 条`
    )
  } catch {
    // api.js 已统一处理错误
  } finally {
    importLoading.value = false
  }
}

async function fetchList() {
  loading.value = true
  try {
    const data = await adminGetStaffList({
      page: page.value,
      pageSize: pageSize.value
    })
    staffList.value = data.list || []
    total.value = data.total || 0
    page.value = data.page || page.value
  } catch {
    // api.js 已统一处理错误
  } finally {
    loading.value = false
  }
}

function openDrawer(row = null) {
  editingStaff.value = row ? { ...row, pageLoadedAt: row.updatedAt || Date.now() } : null
  drawerVisible.value = true
}

async function handleToggle(row) {
  const isDisabling = row.status === 'active'
  const actionText = isDisabling ? '停用' : '启用'

  try {
    await ElMessageBox.confirm(
      `确认${actionText}员工“${row.name}”？${isDisabling ? '停用后该员工将无法登录。' : ''}`,
      `${actionText}确认`,
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await adminToggleStaff(row.staffId, isDisabling ? 'disable' : 'enable')
    ElMessage.success(`已${actionText}`)
    fetchList()
  } catch {
    // 取消或接口错误
  }
}

function openCredentialDialog(data, tip) {
  credentialDialog.value = {
    phone: data.phone || '',
    temporaryPassword: data.temporaryPassword || '',
    tip
  }
  credentialDialogVisible.value = true
}

async function handleResetPassword(row) {
  try {
    await ElMessageBox.confirm(
      `确认重置员工“${row.name}”的登录密码？重置后旧密码会立即失效，需要把新临时密码发给本人。`,
      '重置密码',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const data = await adminResetPassword(row.staffId)
    ElMessage.success('已生成新的密码')
    fetchList()

    if (row.staffId === userStore.adminInfo?.staffId) {
      userStore.updateAdminInfo({
        mustChangePassword: true,
        passwordStatus: 'temporary'
      })
    }

    openCredentialDialog(data, `请把“${row.name}”的新账号信息发给他。`)
  } catch {
    // 取消或接口错误
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认彻底删除员工“${row.name}”吗？删除后该员工将无法登录，员工资料会从后台员工表移除。本操作不可直接恢复。`,
      '删除员工',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await adminDeleteStaff(row.staffId)
    ElMessage.success('删除成功')
    fetchList()
  } catch {
    // 取消或接口错误
  }
}

function copyPassword() {
  const text = credentialDialog.value.temporaryPassword || ''
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success('已复制')
    }).catch(() => {
      ElMessage.warning('复制失败，请手动复制')
    })
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  ElMessage.success('已复制')
}

function onSaved(payload) {
  drawerVisible.value = false
  fetchList()
  if (payload?.credentials?.temporaryPassword) {
    openCredentialDialog(payload.credentials, '请把这组账号信息发给新员工。')
  }
}

function handlePageChange(nextPage) {
  page.value = nextPage
  fetchList()
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.staff-page {
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-action-btn {
    min-width: 112px;
    height: 36px;
  }

  .company-tag {
    margin-right: 6px;
    margin-bottom: 4px;
  }

  .text-muted {
    color: $text-auxiliary;
    font-size: 13px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    padding-top: 20px;
  }

  .hidden-file-input {
    display: none;
  }

  .import-dialog {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .import-dialog__section {
    padding: 18px 20px;
    border: 1px solid $border-color;
    border-radius: 16px;
    background: #fff;
  }

  .import-dialog__label {
    margin: 0 0 10px;
    font-size: 15px;
    font-weight: 600;
    color: $text-primary;
  }

  .import-dialog__text {
    margin: 0 0 8px;
    font-size: 14px;
    line-height: 1.7;
    color: $text-secondary;
  }

  .import-dialog__hint {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: $text-auxiliary;
  }

  .import-upload {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .import-upload__name {
    min-width: 0;
    font-size: 14px;
    color: $text-secondary;
    word-break: break-all;
  }

  .import-result {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .import-result__summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-card {
    padding: 18px 16px;
    border: 1px solid $border-color;
    border-radius: $radius-card;
    background: $card-bg;
    box-shadow: none;
  }

  .summary-card--success {
    border-color: rgba($color-success, 0.3);
    background: rgba($color-success, 0.06);
  }

  .summary-card--danger {
    border-color: rgba($color-error, 0.3);
    background: rgba($color-error, 0.06);
  }

  .summary-card__label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    color: $text-secondary;
  }

  .summary-card__value {
    font-size: 24px;
    line-height: 1;
    color: $text-primary;

    &.success {
      color: $color-success;
    }

    &.danger {
      color: $color-error;
    }
  }

  .credential-dialog {
    .credential-tip {
      margin: 0 0 18px;
      font-size: 14px;
      line-height: 1.7;
      color: $text-secondary;
    }

    .credential-field {
      margin-bottom: 16px;
    }

    .credential-label {
      display: inline-block;
      margin-bottom: 8px;
      font-size: 14px;
      color: $text-secondary;
    }

    .credential-note {
      margin: 6px 0 0;
      font-size: 13px;
      line-height: 1.7;
      color: $text-auxiliary;
    }
  }
}
</style>
