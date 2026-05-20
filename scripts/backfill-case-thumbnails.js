const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const tcbBin = path.join(projectRoot, 'node_modules', '@cloudbase', 'cli', 'bin', 'tcb')
const cloudbaseHome = path.join(projectRoot, '.cloudbase-home')
const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')
const bundledPython = path.join(
  process.env.USERPROFILE || '',
  '.cache',
  'codex-runtimes',
  'codex-primary-runtime',
  'dependencies',
  'python',
  'python.exe'
)
const pythonBin = process.env.CASE_THUMB_PYTHON || (fs.existsSync(bundledPython) ? bundledPython : 'python')

const COVER_WIDTH = 608
const COVER_HEIGHT = 342
const COVER_QUALITY = 85
const THUMB_WIDTH = 160
const THUMB_HEIGHT = 160
const THUMB_QUALITY = 75

function getArgValue(name) {
  const prefix = `${name}=`
  const arg = process.argv.find((item) => item.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : ''
}

function formatRunId(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('')
}

const runId = formatRunId(new Date())
const tempRoot = path.join(os.tmpdir(), `case-cover-size-${runId}`)
const backupDirArg = getArgValue('--backup-dir')
const backupRoot = backupDirArg
  ? path.resolve(projectRoot, backupDirArg)
  : path.join(projectRoot, 'release_backups', `${runId}_case-cover-size-adjustment-images`)
const manifestPath = path.join(backupRoot, 'manifest.json')
const skipManifestPath = getArgValue('--skip-manifest')

function loadManifestEntries(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return []
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return Array.isArray(data.entries) ? data.entries : []
}

const manifest = loadManifestEntries(manifestPath)
const skipCaseIds = new Set(loadManifestEntries(skipManifestPath).map((item) => item.caseId).filter(Boolean))

function extractFirstJsonObject(text) {
  const start = text.indexOf('{')
  if (start === -1) {
    throw new Error(`No JSON object found in output: ${text}`)
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1))
      }
    }
  }

  throw new Error(`Incomplete JSON object in output: ${text}`)
}

function runTcb(args) {
  const result = spawnSync(process.execPath, [tcbBin, ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: cloudbaseHome,
      USERPROFILE: cloudbaseHome
    },
    encoding: 'utf8'
  })

  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  if (result.status !== 0) {
    throw new Error(`tcb ${args.join(' ')} failed:\n${output}`)
  }

  return extractFirstJsonObject(output)
}

function runTcbRaw(args) {
  const result = spawnSync(process.execPath, [tcbBin, ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: cloudbaseHome,
      USERPROFILE: cloudbaseHome
    },
    encoding: 'utf8'
  })

  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  if (result.status !== 0) {
    throw new Error(`tcb ${args.join(' ')} failed:\n${output}`)
  }

  return output
}

function downloadUrlToFile(url, localPath) {
  fs.mkdirSync(path.dirname(localPath), { recursive: true })
  const result = spawnSync('curl.exe', ['-L', '--fail', '--silent', '--show-error', '--output', localPath, url], {
    cwd: projectRoot,
    encoding: 'utf8'
  })

  if (result.status !== 0) {
    throw new Error(`curl download failed:\n${result.stdout || ''}\n${result.stderr || ''}`)
  }
}

function downloadCloudPath(cloudPath, localPath) {
  try {
    runTcbRaw(['storage', 'download', cloudPath, localPath])
    return
  } catch (error) {
    console.warn(`WARN storage download fallback for ${cloudPath}: ${error.message}`)
  }

  const result = runTcb(['storage', 'url', cloudPath, '--json'])
  const url = result.data?.url
  if (!url) {
    throw new Error(`No temporary URL returned for ${cloudPath}`)
  }
  downloadUrlToFile(url, localPath)
}

function buildCommand(commandType, command) {
  return JSON.stringify([
    {
      TableName: 'cases',
      CommandType: commandType,
      Command: JSON.stringify(command)
    }
  ])
}

function queryCasesWithCover() {
  const command = buildCommand('QUERY', {
    find: 'cases',
    filter: {
      deleted: false,
      cover: { $exists: true, $ne: '' }
    },
    projection: {
      _id: 1,
      title: 1,
      cover: 1,
      coverThumb: 1
    },
    limit: 1000
  })

  const result = runTcb(['db', 'nosql', 'execute', '--command', command, '--json'])
  return result.data?.results?.[0] || []
}

function toCloudPath(fileID) {
  const match = String(fileID || '').match(/^cloud:\/\/[^/]+\/(.+)$/)
  if (!match) {
    throw new Error(`Invalid cloud fileID: ${fileID}`)
  }
  return match[1]
}

function toFileId(originalFileID, cloudPath) {
  const match = String(originalFileID || '').match(/^(cloud:\/\/[^/]+\/).+$/)
  if (!match) {
    throw new Error(`Invalid cloud fileID: ${originalFileID}`)
  }
  return `${match[1]}${cloudPath}`
}

function deriveThumbCloudPath(coverCloudPath) {
  return /\.[^./]+$/.test(coverCloudPath)
    ? coverCloudPath.replace(/(\.[^.]+)$/, '-thumb.jpg')
    : `${coverCloudPath}-thumb.jpg`
}

function resolveThumbFileId(coverFileId, coverThumbFileId, coverCloudPath) {
  if (String(coverThumbFileId || '').startsWith('cloud://')) {
    return coverThumbFileId
  }
  return toFileId(coverFileId, deriveThumbCloudPath(coverCloudPath))
}

function safeFileName(value) {
  return String(value || 'unknown')
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

function backupExistingFile(fileID, caseId, suffix) {
  if (!String(fileID || '').startsWith('cloud://')) return null

  const cloudPath = toCloudPath(fileID)
  const ext = path.extname(cloudPath) || '.jpg'
  const backupPath = path.join(backupRoot, `${safeFileName(caseId)}-${suffix}${ext}`)

  try {
    downloadCloudPath(cloudPath, backupPath)
    return { fileID, cloudPath, backupPath }
  } catch (error) {
    console.warn(`WARN backup skipped for ${caseId} ${suffix}: ${error.message}`)
    return { fileID, cloudPath, backupPath: '', error: error.message }
  }
}

function createLocalImage(inputPath, outputPath, width, height, quality) {
  const script = [
    'import sys',
    'from PIL import Image, ImageOps',
    'image = Image.open(sys.argv[1]).convert("RGB")',
    `result = ImageOps.fit(image, (${width}, ${height}), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))`,
    `result.save(sys.argv[2], "JPEG", quality=${quality}, optimize=True, progressive=True)`
  ].join('\n')

  const result = spawnSync(pythonBin, ['-c', script, inputPath, outputPath], {
    cwd: projectRoot,
    encoding: 'utf8'
  })

  if (result.status !== 0) {
    throw new Error(`image generation failed:\n${result.stdout || ''}\n${result.stderr || ''}`)
  }
}

function updateCaseImages(caseId, cover, coverThumb) {
  const command = buildCommand('UPDATE', {
    update: 'cases',
    updates: [
      {
        q: { _id: caseId },
        u: { $set: { cover, coverThumb } }
      }
    ]
  })

  runTcb(['db', 'nosql', 'execute', '--command', command, '--json'])
}

function writeManifest() {
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        runId,
        createdAt: new Date().toISOString(),
        coverSize: `${COVER_WIDTH}x${COVER_HEIGHT}`,
        thumbSize: `${THUMB_WIDTH}x${THUMB_HEIGHT}`,
        entries: manifest
      },
      null,
      2
    )
  )
}

function processCase(item) {
  if (skipCaseIds.has(item._id)) {
    console.log(`SKIP ${item._id}: already listed in skip manifest.`)
    return { updated: false, skipped: true }
  }

  if (!item.cover || !String(item.cover).startsWith('cloud://')) {
    console.log(`SKIP ${item._id}: cover is empty or not a cloud file.`)
    return { updated: false, skipped: true }
  }

  const coverCloudPath = toCloudPath(item.cover)
  const coverThumb = resolveThumbFileId(item.cover, item.coverThumb, coverCloudPath)
  const coverThumbCloudPath = toCloudPath(coverThumb)

  if (dryRun) {
    console.log(`DRY ${item._id}: cover=${coverCloudPath} -> ${COVER_WIDTH}x${COVER_HEIGHT}; coverThumb=${coverThumbCloudPath} -> ${THUMB_WIDTH}x${THUMB_HEIGHT}`)
    return { updated: false, skipped: false }
  }

  const caseTempDir = path.join(tempRoot, safeFileName(item._id))
  const originalPath = path.join(caseTempDir, 'cover-original')
  const resizedCoverPath = path.join(caseTempDir, 'cover-608x342.jpg')
  const thumbPath = path.join(caseTempDir, 'cover-thumb-160x160.jpg')

  fs.mkdirSync(caseTempDir, { recursive: true })
  downloadCloudPath(coverCloudPath, originalPath)

  const coverExt = path.extname(coverCloudPath) || '.jpg'
  const coverBackupPath = path.join(backupRoot, `${safeFileName(item._id)}-cover-original${coverExt}`)
  fs.copyFileSync(originalPath, coverBackupPath)
  const thumbBackup = backupExistingFile(item.coverThumb, item._id, 'cover-thumb-original')

  createLocalImage(originalPath, resizedCoverPath, COVER_WIDTH, COVER_HEIGHT, COVER_QUALITY)
  createLocalImage(resizedCoverPath, thumbPath, THUMB_WIDTH, THUMB_HEIGHT, THUMB_QUALITY)

  runTcbRaw(['storage', 'upload', resizedCoverPath, coverCloudPath, '--json'])
  runTcbRaw(['storage', 'upload', thumbPath, coverThumbCloudPath, '--json'])
  updateCaseImages(item._id, item.cover, coverThumb)

  manifest.push({
    caseId: item._id,
    title: item.title || '',
    cover: item.cover,
    coverCloudPath,
    coverBackupPath,
    coverThumbBefore: item.coverThumb || '',
    coverThumbAfter: coverThumb,
    coverThumbCloudPath,
    coverThumbBackupPath: thumbBackup?.backupPath || '',
    migratedAt: new Date().toISOString()
  })
  writeManifest()
  console.log(`OK ${item._id}: cover=${COVER_WIDTH}x${COVER_HEIGHT}, coverThumb=${THUMB_WIDTH}x${THUMB_HEIGHT}`)
  return { updated: true, skipped: false }
}

function main() {
  if (!dryRun && !force) {
    throw new Error('This script overwrites existing case cover files. Re-run with --force after --dry-run verification.')
  }

  const cases = queryCasesWithCover()
  console.log(`Found ${cases.length} case(s) with cover.`)

  if (!dryRun) {
    fs.mkdirSync(backupRoot, { recursive: true })
    writeManifest()
    console.log(`BackupDir: ${backupRoot}`)
  }

  let updated = 0
  let skipped = 0

  for (const item of cases) {
    const result = processCase(item)
    if (result.updated) updated += 1
    if (result.skipped) skipped += 1
  }

  console.log(`Case cover migration completed. updated=${updated}, skipped=${skipped}, dryRun=${dryRun}, backupDir=${dryRun ? '' : backupRoot}`)
}

try {
  fs.mkdirSync(tempRoot, { recursive: true })
  main()
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
