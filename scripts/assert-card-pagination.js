const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

function assertIncludes(content, expected, message) {
  if (!content.includes(expected)) {
    throw new Error(message)
  }
}

function assertRegex(content, pattern, message) {
  if (!pattern.test(content)) {
    throw new Error(message)
  }
}

const getCardInfo = read('miniprogram/cloudfunctions/getCardInfo/index.js')
const cardPage = read('miniprogram/pages/card/index.js')
const cardWxml = read('miniprogram/pages/card/index.wxml')

assertIncludes(getCardInfo, 'const CASE_PAGE_SIZE = 8', 'getCardInfo should define 8 item case page size')
assertRegex(getCardInfo, /\.limit\(CASE_PAGE_SIZE \+ 1\)/, 'getCardInfo should fetch one extra case to detect hasMore')
assertIncludes(getCardInfo, 'hasMoreCases', 'getCardInfo should return hasMoreCases')
assertIncludes(getCardInfo, 'nextCaseOffset', 'getCardInfo should return nextCaseOffset')

const getCardCasesPath = path.join(root, 'miniprogram/cloudfunctions/getCardCases/index.js')
if (!fs.existsSync(getCardCasesPath)) {
  throw new Error('getCardCases cloud function should exist')
}

;['db.js', 'error-codes.js', 'response.js', 'validate.js'].forEach((fileName) => {
  const sharedPath = path.join(root, 'miniprogram/cloudfunctions/getCardCases/_shared', fileName)
  if (!fs.existsSync(sharedPath)) {
    throw new Error(`getCardCases should include shared helper: ${fileName}`)
  }
})

const getCardCases = read('miniprogram/cloudfunctions/getCardCases/index.js')
assertIncludes(getCardCases, 'const CASE_PAGE_SIZE = 8', 'getCardCases should define 8 item case page size')
assertIncludes(getCardCases, 'const MAX_PAGE_SIZE = 8', 'getCardCases should cap page size at 8')
assertRegex(getCardCases, /\.skip\(safeOffset\)/, 'getCardCases should use offset pagination')
assertRegex(getCardCases, /\.limit\(safeLimit \+ 1\)/, 'getCardCases should fetch one extra case to detect hasMore')
assertIncludes(getCardCases, 'categoryIds: db.command.all([safeCategoryId])', 'getCardCases should support category filtering')
assertIncludes(getCardCases, 'hasMoreCases', 'getCardCases should return hasMoreCases')
assertIncludes(getCardCases, 'nextCaseOffset', 'getCardCases should return nextCaseOffset')

assertIncludes(cardPage, 'casesLoadingMore: false', 'card page should track loading-more state')
assertIncludes(cardPage, 'hasMoreCases: false', 'card page should track whether more cases exist')
assertIncludes(cardPage, 'nextCaseOffset: 0', 'card page should track next case offset')
assertIncludes(cardPage, 'onReachBottom()', 'card page should load more cases on page bottom')
assertIncludes(cardPage, "callCloud('getCardCases'", 'card page should call getCardCases for more cases')
assertIncludes(cardPage, 'casesLoadingMore: true', 'card page should prevent duplicate load-more calls')
assertIncludes(cardPage, 'activeCategoryId', 'card page should preserve category filtering state')

assertIncludes(cardWxml, 'casesLoadingMore', 'card page WXML should render loading-more state')
assertIncludes(cardWxml, 'hasMoreCases', 'card page WXML should render loaded-all state')

console.log('card pagination assertions passed')
