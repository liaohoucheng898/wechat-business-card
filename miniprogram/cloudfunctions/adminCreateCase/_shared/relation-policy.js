function normalizeUniqueIds(values = []) {
  if (!Array.isArray(values)) {
    return []
  }

  const ids = []
  const seen = new Set()
  values.forEach((item) => {
    const id = String(item || '').trim()
    if (!id || seen.has(id)) {
      return
    }
    ids.push(id)
    seen.add(id)
  })
  return ids
}

function relationError(message) {
  const error = new Error(message)
  error.code = 'RELATION_INVALID'
  return error
}

async function getDocById(db, collectionName, id) {
  try {
    const { data } = await db.collection(collectionName).doc(id).get()
    return data || null
  } catch (error) {
    if (error && error.errCode === -1) {
      return null
    }
    throw error
  }
}

async function validateCompanyIds(db, ids, options = {}) {
  const requireNonEmpty = options.requireNonEmpty !== false
  const normalizedIds = normalizeUniqueIds(ids)

  if (requireNonEmpty && normalizedIds.length === 0) {
    throw relationError('company_required')
  }

  for (const companyId of normalizedIds) {
    const company = await getDocById(db, 'companies', companyId)
    if (!company) {
      throw relationError(`company_not_found:${companyId}`)
    }
    if (company.deleted || company.status === 'disabled') {
      throw relationError(`company_unavailable:${companyId}`)
    }
  }

  return normalizedIds
}

async function validateCategoryIds(db, ids, options = {}) {
  const requireNonEmpty = options.requireNonEmpty === true
  const allowedCompanyIds = normalizeUniqueIds(options.allowedCompanyIds || [])
  const normalizedIds = normalizeUniqueIds(ids)

  if (requireNonEmpty && normalizedIds.length === 0) {
    throw relationError('category_required')
  }

  for (const categoryId of normalizedIds) {
    const category = await getDocById(db, 'case_categories', categoryId)
    if (!category) {
      throw relationError(`category_not_found:${categoryId}`)
    }
    if (category.deleted || category.status === 'disabled') {
      throw relationError(`category_unavailable:${categoryId}`)
    }
    if (allowedCompanyIds.length > 0 && category.companyId && !allowedCompanyIds.includes(category.companyId)) {
      throw relationError(`category_company_mismatch:${categoryId}`)
    }
  }

  return normalizedIds
}

async function validateEnabledCompanies(db, enabledCompanies) {
  if (!Array.isArray(enabledCompanies) || enabledCompanies.length === 0) {
    throw relationError('company_required')
  }

  const titleMap = new Map()
  const ids = []
  enabledCompanies.forEach((item) => {
    const companyId = String(item?.companyId || '').trim()
    if (!companyId) {
      return
    }
    ids.push(companyId)
    if (!titleMap.has(companyId)) {
      titleMap.set(companyId, String(item?.title || '').trim())
    }
  })

  const normalizedIds = await validateCompanyIds(db, ids, { requireNonEmpty: true })
  return normalizedIds.map((companyId) => ({
    companyId,
    title: titleMap.get(companyId) || '',
  }))
}

module.exports = {
  normalizeUniqueIds,
  validateCompanyIds,
  validateCategoryIds,
  validateEnabledCompanies,
}
