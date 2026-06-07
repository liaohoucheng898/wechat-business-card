const fs = require('fs')
const path = require('path')
const vm = require('vm')
const assert = require('assert')

const root = path.resolve(__dirname, '..')
const sourcePath = path.join(root, 'miniprogram/pages/my-card/index.js')
const source = fs.readFileSync(sourcePath, 'utf8')

let pageConfig = null
let callCloudImpl = () => Promise.resolve(null)

function createRequireStub() {
  return function requireStub(request) {
    if (request === '../../utils/cloud') {
      return { callCloud: (...args) => callCloudImpl(...args) }
    }
    if (request === '../../utils/auth') {
      return {
        isLoggedIn: () => true,
        getStaffInfo: () => null,
        saveSession: () => {}
      }
    }
    if (request === '../../config/env') {
      return {
        defaultAvatar: '/images/default-avatar.png',
        companyMap: {
          company_001: 'Company One',
          company_002: 'Company Two',
          company_003: 'Company Three'
        }
      }
    }
    throw new Error(`Unexpected require: ${request}`)
  }
}

vm.runInNewContext(source, {
  require: createRequireStub(),
  Page: (config) => {
    pageConfig = config
  },
  console
}, { filename: sourcePath })

if (!pageConfig) {
  throw new Error('my-card page config should be registered')
}

function createPage() {
  return {
    ...pageConfig,
    data: JSON.parse(JSON.stringify(pageConfig.data)),
    setData(patch) {
      this.data = { ...this.data, ...patch }
    }
  }
}

function seedCurrentCard(page) {
  page._requestSeed = 0
  page.data.activeCompanyId = 'company_001'
  page.data.currentCard = {
    companyId: 'company_001',
    staff: { name: 'Tom' },
    company: {
      name: 'Company One',
      address: 'real address',
      displayAddress: 'real address',
      locationName: ''
    }
  }
  page._cardCache = {
    company_001: {
      company: { address: 'real address' }
    }
  }
}

function waitForAsyncRefresh() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const staffInfo = {
  staffId: 'staff_001',
  name: 'Tom',
  title: 'General Manager',
  avatar: '',
  phone: '18600000000',
  secondPhone: '',
  showSecondPhone: false,
  email: 'tom@example.com',
  enabledCompanies: [
    { companyId: 'company_001', title: 'General Manager' }
  ]
}

async function main() {
  const page = createPage()
  seedCurrentCard(page)
  page._loadAllCompanyCards = function noop() {}

  page._syncLocalState(staffInfo, false)

  assert.strictEqual(
    page.data.currentCard.company.displayAddress,
    'real address',
    'background staff sync should keep the current display address until refreshed card data arrives'
  )
  assert.ok(
    page._cardCache.company_001,
    'background staff sync should not clear the current card cache before refreshed card data arrives'
  )

  const refreshPage = createPage()
  seedCurrentCard(refreshPage)
  callCloudImpl = () => Promise.reject(new Error('network error'))

  refreshPage._loadAllCompanyCards(
    staffInfo,
    refreshPage._buildCompanyTabs(staffInfo),
    'company_001'
  )
  await waitForAsyncRefresh()

  assert.strictEqual(
    refreshPage.data.currentCard.company.displayAddress,
    'real address',
    'failed background card refresh should keep the current display address'
  )
}

main().then(() => {
  console.log('my-card share address refresh assertions passed')
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
