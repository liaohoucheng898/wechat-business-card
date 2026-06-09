const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const policy = require('../../miniprogram/cloudfunctions/_shared/relation-policy')

assert.deepEqual(policy.normalizeUniqueIds([' c1 ', 'c1', '', null, 'c2']), ['c1', 'c2'])

function createFakeDb(collections) {
  return {
    collection(name) {
      return {
        doc(id) {
          return {
            async get() {
              const data = collections[name] && collections[name][id]
              if (!data) {
                const error = new Error('not found')
                error.errCode = -1
                throw error
              }
              return { data: { _id: id, ...data } }
            }
          }
        }
      }
    }
  }
}

;(async () => {
  const db = createFakeDb({
    companies: {
      c1: { deleted: false, status: 'active' },
      c2: { deleted: true, status: 'active' },
      c3: { deleted: false, status: 'disabled' }
    },
    case_categories: {
      k1: { deleted: false },
      k2: { deleted: true }
    }
  })

  assert.deepEqual(await policy.validateCompanyIds(db, ['c1']), ['c1'])
  await assert.rejects(() => policy.validateCompanyIds(db, ['missing']), /company_not_found/)
  await assert.rejects(() => policy.validateCompanyIds(db, ['c2']), /company_unavailable/)
  await assert.rejects(() => policy.validateCompanyIds(db, ['c3']), /company_unavailable/)
  assert.deepEqual(await policy.validateCategoryIds(db, ['k1']), ['k1'])
  await assert.rejects(() => policy.validateCategoryIds(db, ['k2']), /category_unavailable/)

  const createStaff = fs.readFileSync(path.join(__dirname, '../../miniprogram/cloudfunctions/adminCreateStaff/index.js'), 'utf8')
  const updateStaff = fs.readFileSync(path.join(__dirname, '../../miniprogram/cloudfunctions/adminUpdateStaff/index.js'), 'utf8')
  const updateCase = fs.readFileSync(path.join(__dirname, '../../miniprogram/cloudfunctions/adminUpdateCase/index.js'), 'utf8')

  assert.match(createStaff, /validateEnabledCompanies\(/, 'adminCreateStaff must validate enabledCompanies server-side')
  assert.match(updateStaff, /validateEnabledCompanies\(/, 'adminUpdateStaff must validate enabledCompanies server-side')
  assert.match(updateCase, /validateCompanyIds\(/, 'adminUpdateCase must validate companyIds server-side')
  assert.match(updateCase, /validateCategoryIds\(/, 'adminUpdateCase must validate categoryIds server-side')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
