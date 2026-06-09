const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')
const dashboardPath = path.join(root, 'admin/src/views/dashboard/index.vue')
const statsPath = path.join(root, 'admin/src/views/stats/index.vue')

const dashboardSource = fs.readFileSync(dashboardPath, 'utf8')
const statsSource = fs.readFileSync(statsPath, 'utf8')

function assertRankFieldMapping(source, label) {
  const requiredMappings = [
    ['weekViews', 'views7d'],
    ['halfMonthViews', 'views15d'],
    ['monthViews', 'views30d'],
    ['totalViews', 'viewsTotal'],
  ]

  requiredMappings.forEach(([target, sourceField]) => {
    const pattern = new RegExp(`${target}:\\s*item\\.${target}\\s*\\?\\?\\s*item\\.${sourceField}\\s*\\?\\?\\s*0`)
    assert(
      pattern.test(source),
      `${label} should map ${sourceField} to ${target} with a 0 fallback`
    )
  })
}

assertRankFieldMapping(statsSource, 'stats page')
assertRankFieldMapping(dashboardSource, 'dashboard page')
