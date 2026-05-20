const { COL, getDb, getAdminConfig } = require('./db')
const { E0207, E0208, E0211 } = require('./error-codes')

async function verifyAdminByStaffId(staffId) {
  if (!staffId) {
    return { error: E0207 }
  }

  const db = getDb()

  let staff
  try {
    const res = await db.collection(COL.STAFF).doc(staffId).get()
    staff = res.data
  } catch (e) {
    return { error: E0207 }
  }

  if (!staff) {
    return { error: E0207 }
  }

  if (staff.status !== 'active') {
    return { error: E0211 }
  }

  if (!staff.isAdmin) {
    return { error: E0208 }
  }

  const adminConfig = await getAdminConfig()
  if (!adminConfig || !adminConfig.adminPhones.includes(staff.phone)) {
    return { error: E0208 }
  }

  return { staffInfo: staff }
}

module.exports = { verifyAdminByStaffId }
