// Local pet skins: <userData>/pets/<id>/{pet.json,atlas.png}, validated like
// Envoy's src-tauri/src/pets.rs. Delivered to the renderer as IPC bytes.
import fs from 'node:fs'
import path from 'node:path'
import { crc32, inflateSync } from 'node:zlib'

// Mirrors PetState in src/store/pet.ts. electron/ and src/ are separate TS
// projects (tsconfig.electron.json excludes src/) — kept in sync by hand.
export const PET_STATES = ['idle', 'wave', 'run', 'failed', 'review', 'jump', 'waiting', 'sleeping'] as const

const ID_PATTERN = /^[a-z0-9_-]{1,64}$/
const MIN_FRAME_PX = 16
const MAX_FRAME_PX = 512
const MIN_COLUMNS = 1
const MAX_COLUMNS = 64
const MAX_PNG_BYTES = 8 * 1024 * 1024
const MAX_PNG_DIM_PX = 16384
const MAX_DECODED_PNG_BYTES = 128 * 1024 * 1024
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export interface LocalPetManifest {
  id: string
  displayName?: string
  frameW: number
  frameH: number
  columns: number
  stateRows: Record<string, number>
}

export interface LocalPet extends LocalPetManifest {
  atlasPath: string
}

export interface LocalPetRejected {
  id: string
  reason: string
}

interface PngHeader {
  width: number
  height: number
  bitDepth: number
  colorType: number
  channels: number
  interlace: number
}

function parsePngHeader(data: Buffer): PngHeader | null {
  const width = data.readUInt32BE(0)
  const height = data.readUInt32BE(4)
  const bitDepth = data[8]
  const colorType = data[9]
  const channels: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }
  const depths: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }

  if (
    !width ||
    !height ||
    width > MAX_PNG_DIM_PX ||
    height > MAX_PNG_DIM_PX ||
    !depths[colorType]?.includes(bitDepth) ||
    data[10] !== 0 ||
    data[11] !== 0 ||
    data[12] > 1
  ) {
    return null
  }

  return { width, height, bitDepth, colorType, channels: channels[colorType], interlace: data[12] }
}

function validPngChunk(buf: Buffer, offset: number, dataEnd: number, chunkEnd: number): boolean {
  return chunkEnd <= buf.length && crc32(buf.subarray(offset + 4, dataEnd)) === buf.readUInt32BE(dataEnd)
}

function completePng(
  header: PngHeader | null,
  idat: Buffer[],
  palette: boolean,
  length: number,
  chunkEnd: number,
  totalLength: number
): { header: PngHeader; idat: Buffer[] } | null {
  if (length !== 0 || chunkEnd !== totalLength || !header || !idat.length || (header.colorType === 3 && !palette))
    return null
  return { header, idat }
}

function parsePngChunks(buf: Buffer): { header: PngHeader; idat: Buffer[] } | null {
  if (buf.length < 57 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null

  let offset = 8
  let header: PngHeader | null = null
  let palette = false
  const idat: Buffer[] = []

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    const dataEnd = offset + 8 + length
    const chunkEnd = dataEnd + 4
    if (!validPngChunk(buf, offset, dataEnd, chunkEnd)) return null

    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, dataEnd)
    if (offset === 8 && (type !== 'IHDR' || length !== 13)) return null

    if (type === 'IHDR') {
      if (offset !== 8) return null
      header = parsePngHeader(data)
      if (!header) return null
    } else if (type === 'PLTE') {
      palette = length > 0 && length % 3 === 0 && length <= 768
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      return completePng(header, idat, palette, length, chunkEnd, buf.length)
    }
    offset = chunkEnd
  }

  return null
}

function pngRows(header: PngHeader): Array<{ bytes: number; count: number }> {
  const passes =
    header.interlace === 0
      ? [[0, 0, 1, 1]]
      : [
          [0, 0, 8, 8],
          [4, 0, 8, 8],
          [0, 4, 4, 8],
          [2, 0, 4, 4],
          [0, 2, 2, 4],
          [1, 0, 2, 2]
        ]
  const rows: Array<{ bytes: number; count: number }> = []

  for (const [x, y, stepX, stepY] of passes) {
    const passWidth = Math.max(0, Math.ceil((header.width - x) / stepX))
    const passHeight = Math.max(0, Math.ceil((header.height - y) / stepY))
    if (!passWidth || !passHeight) continue
    rows.push({ bytes: Math.ceil((passWidth * header.channels * header.bitDepth) / 8), count: passHeight })
  }
  return rows
}

function readPngSize(buf: Buffer): { width: number; height: number } | null {
  const chunks = parsePngChunks(buf)
  if (!chunks) return null

  const rows = pngRows(chunks.header)
  const expected = rows.reduce((total, { bytes, count }) => total + (bytes + 1) * count, 0)
  if (expected > MAX_DECODED_PNG_BYTES) return null

  let decoded: Buffer
  try {
    decoded = inflateSync(Buffer.concat(chunks.idat), { maxOutputLength: MAX_DECODED_PNG_BYTES })
  } catch {
    return null
  }
  if (decoded.length !== expected) return null

  let cursor = 0
  for (const { bytes, count } of rows) {
    for (let row = 0; row < count; row += 1) {
      if (decoded[cursor] > 4) return null
      cursor += bytes + 1
    }
  }
  return { width: chunks.header.width, height: chunks.header.height }
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

// `pet.json`'s shape, independent of the folder/file-size checks around it.
function validateManifest(raw: unknown): LocalPetManifest | string {
  if (!raw || typeof raw !== 'object') {
    return 'pet.json is not an object'
  }

  const m = raw as Record<string, unknown>

  if (typeof m.id !== 'string' || !ID_PATTERN.test(m.id)) {
    return 'id must match [a-z0-9_-]{1,64}'
  }

  if (!isIntegerInRange(m.frameW, MIN_FRAME_PX, MAX_FRAME_PX)) {
    return `frameW must be ${MIN_FRAME_PX}-${MAX_FRAME_PX}`
  }

  if (!isIntegerInRange(m.frameH, MIN_FRAME_PX, MAX_FRAME_PX)) {
    return `frameH must be ${MIN_FRAME_PX}-${MAX_FRAME_PX}`
  }

  if (!isIntegerInRange(m.columns, MIN_COLUMNS, MAX_COLUMNS)) {
    return `columns must be ${MIN_COLUMNS}-${MAX_COLUMNS}`
  }

  if (!m.stateRows || typeof m.stateRows !== 'object') {
    return 'stateRows is required'
  }

  const rows = m.stateRows as Record<string, unknown>
  const missing = PET_STATES.filter(s => !Number.isInteger(rows[s]) || (rows[s] as number) < 0)

  if (missing.length) {
    return `stateRows missing: ${missing.join(', ')}`
  }

  return {
    columns: m.columns,
    displayName: typeof m.displayName === 'string' ? m.displayName : undefined,
    frameH: m.frameH,
    frameW: m.frameW,
    id: m.id,
    stateRows: rows as Record<string, number>
  }
}

// No symlinks anywhere in the folder — a symlinked atlas could read a PNG
// from outside <userData>/pets.
export function validateLocalPet(dir: string, folderName: string): LocalPet | LocalPetRejected {
  const reject = (reason: string): LocalPetRejected => ({ id: folderName, reason })

  let dirStat

  try {
    dirStat = fs.lstatSync(dir)
  } catch {
    return reject('folder is unreadable')
  }

  if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) {
    return reject('not a real directory (symlinks are not allowed)')
  }

  const manifestPath = path.join(dir, 'pet.json')
  const atlasPath = path.join(dir, 'atlas.png')
  let manifestStat, atlasStat

  try {
    manifestStat = fs.lstatSync(manifestPath)
    atlasStat = fs.lstatSync(atlasPath)
  } catch {
    return reject('missing pet.json or atlas.png')
  }

  if (manifestStat.isSymbolicLink() || atlasStat.isSymbolicLink()) {
    return reject('symlinks are not allowed')
  }

  if (!manifestStat.isFile() || !atlasStat.isFile()) {
    return reject('pet.json and atlas.png must be regular files')
  }

  let manifest: LocalPetManifest

  try {
    const result = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')))

    if (typeof result === 'string') {
      return reject(result)
    }

    manifest = result
  } catch {
    return reject('pet.json is not valid JSON')
  }

  if (manifest.id !== folderName) {
    return reject('pet.json id must match the folder name')
  }

  if (atlasStat.size > MAX_PNG_BYTES) {
    return reject(`atlas.png exceeds ${MAX_PNG_BYTES} bytes`)
  }

  let atlas: Buffer

  try {
    atlas = fs.readFileSync(atlasPath)
  } catch {
    return reject('atlas.png is unreadable')
  }

  const size = readPngSize(atlas)

  if (!size) {
    return reject('atlas.png is not a valid PNG')
  }

  if (
    manifest.columns * manifest.frameW > size.width ||
    Math.max(...PET_STATES.map(state => manifest.stateRows[state])) * manifest.frameH + manifest.frameH > size.height
  ) {
    return reject('pet frames do not fit atlas.png')
  }

  return { ...manifest, atlasPath }
}

// Invalid folders are skipped and reported, never thrown. A missing
// directory is just an empty result.
export function scanLocalPets(petsDir: string): { pets: LocalPet[]; rejected: LocalPetRejected[] } {
  const pets: LocalPet[] = []
  const rejected: LocalPetRejected[] = []
  let entries: fs.Dirent[]

  try {
    entries = fs.readdirSync(petsDir, { withFileTypes: true })
  } catch {
    return { pets, rejected }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const result = validateLocalPet(path.join(petsDir, entry.name), entry.name)

    if ('reason' in result) {
      rejected.push(result)
    } else {
      pets.push(result)
    }
  }

  return { pets, rejected }
}
