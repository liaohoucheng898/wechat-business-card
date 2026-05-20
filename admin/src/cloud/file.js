import cloudApp from './init'

export async function getTempFileURL(fileID) {
  if (!fileID) return ''
  if (!fileID.startsWith('cloud://')) return fileID

  try {
    const res = await cloudApp.getTempFileURL({ fileList: [fileID] })
    return res.fileList?.[0]?.tempFileURL || ''
  } catch {
    return ''
  }
}

function getMappedFieldMeta(item, field) {
  const rawValue = item[field] || ''
  const candidates = [rawValue, item[`${field}Original`], item[`${field}Raw`]].filter(Boolean)
  const cloudSource = candidates.find((value) => value.startsWith('cloud://'))
  const sourceValue = cloudSource || candidates[0] || ''

  return { rawValue, sourceValue }
}

export async function mapTempFileURLs(items, field) {
  const mappedItems = items.map((item) => ({
    item,
    ...getMappedFieldMeta(item, field)
  }))
  const values = [...new Set(mappedItems.map(({ sourceValue }) => sourceValue).filter(Boolean))]
  const cloudFileIDs = values.filter((value) => value.startsWith('cloud://'))

  if (!cloudFileIDs.length) {
    return mappedItems.map(({ item, rawValue, sourceValue }) => ({
      ...item,
      [`${field}Raw`]: rawValue,
      [`${field}Source`]: sourceValue,
      [field]: sourceValue || ''
    }))
  }

  let tempMap = new Map()
  try {
    const res = await cloudApp.getTempFileURL({ fileList: cloudFileIDs })
    tempMap = new Map(
      (res.fileList || []).map((file) => [file.fileID, file.tempFileURL || ''])
    )
  } catch {}

  return mappedItems.map(({ item, rawValue, sourceValue }) => {
    if (!sourceValue) {
      return {
        ...item,
        [`${field}Raw`]: rawValue,
        [`${field}Source`]: '',
        [field]: ''
      }
    }
    if (!sourceValue.startsWith('cloud://')) {
      return {
        ...item,
        [`${field}Raw`]: rawValue,
        [`${field}Source`]: sourceValue,
        [field]: sourceValue
      }
    }
    return {
      ...item,
      [`${field}Raw`]: rawValue,
      [`${field}Source`]: sourceValue,
      [field]: tempMap.get(sourceValue) || ''
    }
  })
}
