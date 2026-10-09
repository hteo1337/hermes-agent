// Local pet skins: <userData>/pets/<id>/{pet.json,atlas.png}, validated like
// Envoy's src-tauri/src/pets.rs. Delivered to the renderer as IPC bytes.
import fs from 'node:fs'
import path from 'node:path'

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

function readPngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE) || buf.toString('ascii', 12, 16) !== 'IHDR') {
    return null
  }

  return { height: buf.readUInt32BE(20), width: buf.readUInt32BE(16) }
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

  if (typeof m.frameW !== 'number' || m.frameW < MIN_FRAME_PX || m.frameW > MAX_FRAME_PX) {
    return `frameW must be ${MIN_FRAME_PX}-${MAX_FRAME_PX}`
  }

  if (typeof m.frameH !== 'number' || m.frameH < MIN_FRAME_PX || m.frameH > MAX_FRAME_PX) {
    return `frameH must be ${MIN_FRAME_PX}-${MAX_FRAME_PX}`
  }

  if (typeof m.columns !== 'number' || m.columns < MIN_COLUMNS || m.columns > MAX_COLUMNS) {
    return `columns must be ${MIN_COLUMNS}-${MAX_COLUMNS}`
  }

  if (!m.stateRows || typeof m.stateRows !== 'object') {
    return 'stateRows is required'
  }

  const rows = m.stateRows as Record<string, unknown>
  const missing = PET_STATES.filter(s => typeof rows[s] !== 'number')

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

  const size = readPngSize(fs.readFileSync(atlasPath))

  if (!size) {
    return reject('atlas.png is not a valid PNG')
  }

  if (size.width > MAX_PNG_DIM_PX || size.height > MAX_PNG_DIM_PX) {
    return reject(`atlas.png exceeds ${MAX_PNG_DIM_PX}px`)
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
