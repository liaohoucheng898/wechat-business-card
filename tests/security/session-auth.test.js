const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')

const authPath = path.resolve(__dirname, '../../miniprogram/cloudfunctions/_shared/auth.js')
const dbPath = path.resolve(__dirname, '../../miniprogram/cloudfunctions/_shared/db.js')
const sessionPath = path.resolve(__dirname, '../../miniprogram/cloudfunctions/_shared/session.js')

let currentOpenid = 'openid-a'
let currentDb = null

function createDb(staffRecords = []) {
  return {
    collection(name) {
      const records = name === 'staff' ? staffRecords : []
      let whereQuery = null
      let limitCount = records.length

      return {
        where(query) {
          whereQuery = query
          return this
        },
        limit(count) {
          limitCount = count
          return this
        },
        async get() {
          const matched = whereQuery
            ? records.filter((record) => Object.entries(whereQuery).every(([key, value]) => record[key] === value))
            : records
          return { data: matched.slice(0, limitCount) }
        },
      }
    },
  }
}

const originalLoad = Module._load
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'wx-server-sdk') {
    return {
      DYNAMIC_CURRENT_ENV: 'test',
      getWXContext() {
        return { OPENID: currentOpenid }
      },
      database() {
        return currentDb
      },
    }
  }

  return originalLoad.call(this, request, parent, isMain)
}

function loadFreshModules() {
  delete require.cache[authPath]
  delete require.cache[dbPath]
  delete require.cache[sessionPath]
  return {
    auth: require(authPath),
    session: require(sessionPath),
  }
}

async function main() {
  const { session } = loadFreshModules()

  const token = 'raw-session-token'
  const expiresAt = new Date(Date.now() + 60 * 1000)
  const tokenHash = session.hashSessionToken(token)
  assert.equal(tokenHash.length, 64)

  assert.deepEqual(session.buildSessionFields(token, 'openid-a', expiresAt), {
    sessionToken: null,
    sessionTokenHash: tokenHash,
    sessionOpenid: 'openid-a',
    sessionExpireAt: expiresAt,
  })

  assert.deepEqual(session.clearSessionFields(), {
    sessionToken: null,
    sessionTokenHash: null,
    sessionOpenid: null,
    sessionExpireAt: null,
    pcSessionToken: null,
    pcSessionExpireAt: null,
  })

  currentOpenid = 'openid-a'
  currentDb = createDb([
    {
      _id: 'staff-1',
      status: 'active',
      sessionTokenHash: tokenHash,
      sessionOpenid: 'openid-a',
      sessionExpireAt: expiresAt,
    },
  ])
  let loaded = loadFreshModules()
  let result = await loaded.auth.verifyToken(token)
  assert.equal(result.staffInfo._id, 'staff-1')

  currentOpenid = 'openid-b'
  loaded = loadFreshModules()
  result = await loaded.auth.verifyToken(token)
  assert.equal(result.error.code, 'E0207')

  currentOpenid = 'openid-a'
  currentDb = createDb([
    {
      _id: 'staff-legacy',
      status: 'active',
      sessionToken: 'legacy-token',
      openids: ['openid-a'],
      sessionExpireAt: expiresAt,
    },
  ])
  loaded = loadFreshModules()
  result = await loaded.auth.verifyToken('legacy-token')
  assert.equal(result.staffInfo._id, 'staff-legacy')

  currentOpenid = 'openid-b'
  loaded = loadFreshModules()
  result = await loaded.auth.verifyToken('legacy-token')
  assert.equal(result.error.code, 'E0207')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    Module._load = originalLoad
  })
