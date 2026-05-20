const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { resolveRichTextUrls } = require('./_shared/richtext')

const COL = {
  CASES: 'cases',
  CASE_CATEGORIES: 'case_categories',
}

function success(data = {}) {
  return { code: 0, msg: 'ok', data }
}

function fail(message = '请求失败', code = 'E0102') {
  return { code, msg: message }
}

function getDb() {
  return cloud.database()
}

async function resolveFileUrl(fileID) {
  if (!fileID) return ''
  if (!fileID.startsWith('cloud://')) return fileID

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] })
    return (fileList && fileList[0] && fileList[0].tempFileURL) || ''
  } catch (error) {
    console.error('[getCaseDetail] getTempFileURL failed:', error?.message || String(error))
    return ''
  }
}

exports.main = async (event) => {
  const { caseId, companyId = '' } = event

  try {
    if (!caseId) {
      return fail('缺少 caseId', 'E0101')
    }

    const db = getDb()
    let caseDoc
    try {
      const { data } = await db.collection(COL.CASES).doc(caseId).get()
      caseDoc = data
    } catch (error) {
      if (error.errCode === -1) {
        return fail('案例不存在', 'E0501')
      }
      throw error
    }

    if (!caseDoc || caseDoc.deleted) {
      return fail('案例不存在', 'E0501')
    }

    if (!caseDoc.visible) {
      return fail('案例暂不可查看', 'E0502')
    }

    if (companyId && !(caseDoc.companyIds || []).includes(companyId)) {
      return fail('案例暂不可查看', 'E0502')
    }

    const categoryIds = Array.isArray(caseDoc.categoryIds) ? caseDoc.categoryIds : []
    let categoryNames = []
    if (categoryIds.length) {
      const dbCmd = db.command
      const { data: categoryDocs } = await db.collection(COL.CASE_CATEGORIES)
        .where({ _id: dbCmd.in(categoryIds) })
        .get()
      const categoryMap = new Map((categoryDocs || []).map((item) => [item._id, item.name]))
      categoryNames = categoryIds.map((id) => categoryMap.get(id)).filter(Boolean)
    }

    return success({
      caseId: caseDoc._id,
      title: caseDoc.title || '',
      description: caseDoc.description || '',
      cover: await resolveFileUrl(caseDoc.cover || ''),
      content: await resolveRichTextUrls(cloud, caseDoc.content || ''),
      companyIds: caseDoc.companyIds || [],
      categoryIds,
      categoryNames,
    })
  } catch (error) {
    console.error('[getCaseDetail] error:', error?.message || String(error))
    return fail('加载案例详情失败', 'E0102')
  }
}
