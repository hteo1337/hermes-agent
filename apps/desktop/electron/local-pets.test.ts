import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'

import { test, vi } from 'vitest'

import { PET_STATES, readLocalPetAtlas, scanLocalPets } from './local-pets'

const realAtlas = fileURLToPath(new URL('../src/components/pet/pet-egg-sheet.png', import.meta.url))
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function pngChunk(type: string, data: Buffer): Buffer {
  const content = Buffer.concat([Buffer.from(type), data])
  const chunk = Buffer.alloc(content.length + 8)
  chunk.writeUInt32BE(data.length, 0)
  content.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(content), chunk.length - 4)

  return chunk
}

function interlacedAtlas(includeFinalPass: boolean): Buffer {
  const width = 32
  const height = 384
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // grayscale, one byte per pixel
  header[12] = 1 // Adam7

  const passes = [
    [0, 0, 8, 8],
    [4, 0, 8, 8],
    [0, 4, 4, 8],
    [2, 0, 4, 4],
    [0, 2, 2, 4],
    [1, 0, 2, 2],
    [0, 1, 1, 2]
  ]

  const rows = (includeFinalPass ? passes : passes.slice(0, -1)).map(([x, y, stepX, stepY]) => {
    const passWidth = Math.ceil((width - x) / stepX)
    const passHeight = Math.ceil((height - y) / stepY)

    return Buffer.alloc((passWidth + 1) * passHeight) // zero filter and black pixels
  })

  return Buffer.concat([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

function manifest(id: string, frameH = 32) {
  return {
    id,
    frameW: 32,
    frameH,
    columns: 1,
    stateRows: Object.fromEntries(PET_STATES.map((state, index) => [state, index]))
  }
}

test('local pet scan keeps a real skin when neighboring atlases are invalid', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-local-pets-'))
  const petsDir = path.join(root, 'pets')

  try {
    for (const id of ['valid', 'linked', 'directory-atlas', 'truncated', 'bad-layout']) {
      const dir = path.join(petsDir, id)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify(manifest(id, id === 'bad-layout' ? 64 : 32)))
    }

    const atlasFor = (id: string) => path.join(petsDir, id, 'atlas.png')
    fs.copyFileSync(realAtlas, atlasFor('valid'))
    fs.copyFileSync(realAtlas, atlasFor('bad-layout'))
    fs.symlinkSync(atlasFor('valid'), atlasFor('linked'))
    fs.mkdirSync(atlasFor('directory-atlas'))
    fs.writeFileSync(atlasFor('truncated'), fs.readFileSync(realAtlas).subarray(0, 24))

    const result = scanLocalPets(petsDir)

    assert.deepEqual(
      result.pets.map(pet => pet.id),
      ['valid']
    )
    assert.deepEqual(
      new Map(result.rejected.map(({ id, reason }) => [id, reason])),
      new Map([
        ['linked', 'symlinks are not allowed'],
        ['directory-atlas', 'pet.json and atlas.png must be regular files'],
        ['truncated', 'atlas.png is not a valid PNG'],
        ['bad-layout', 'pet frames do not fit atlas.png']
      ])
    )
  } finally {
    fs.rmSync(root, { force: true, recursive: true })
  }
})

test('Adam7 atlas needs all seven passes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-adam7-pets-'))

  try {
    for (const [id, complete] of [
      ['interlaced', true],
      ['missing-pass', false]
    ] as const) {
      const dir = path.join(root, id)
      fs.mkdirSync(dir)
      fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify(manifest(id)))
      fs.writeFileSync(path.join(dir, 'atlas.png'), interlacedAtlas(complete))
    }

    const result = scanLocalPets(root)
    assert.deepEqual(
      result.pets.map(pet => pet.id),
      ['interlaced']
    )
    assert.deepEqual(
      result.rejected.map(pet => pet.id),
      ['missing-pass']
    )
  } finally {
    fs.rmSync(root, { force: true, recursive: true })
  }
})

test('atlas bytes remain validated when pathname is replaced after opening', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-atlas-swap-'))
  const dir = path.join(root, 'valid')
  fs.mkdirSync(dir)
  fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify(manifest('valid')))
  const atlasPath = path.join(dir, 'atlas.png')
  const expected = fs.readFileSync(realAtlas)
  fs.writeFileSync(atlasPath, expected)
  const replacement = path.join(root, 'replacement.png')
  fs.writeFileSync(replacement, 'not an atlas')
  const originalFstat = fs.fstatSync
  let fstatCalls = 0

  const spy = vi.spyOn(fs, 'fstatSync').mockImplementation(fd => {
    if (++fstatCalls === 2) {
      fs.renameSync(atlasPath, path.join(dir, 'original.png'))
      fs.symlinkSync(replacement, atlasPath)
    }

    return originalFstat(fd)
  })

  try {
    assert.deepEqual(readLocalPetAtlas(root, 'valid'), expected)
    assert.equal(fs.readFileSync(atlasPath, 'utf8'), 'not an atlas')
    assert.equal(readLocalPetAtlas(root, ['valid'] as unknown as string), null)
  } finally {
    spy.mockRestore()
    fs.rmSync(root, { force: true, recursive: true })
  }
})

test('manifest swap to a symlink at open is rejected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-manifest-swap-'))
  const dir = path.join(root, 'valid')
  fs.mkdirSync(dir)
  const manifestPath = path.join(dir, 'pet.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest('valid')))
  fs.copyFileSync(realAtlas, path.join(dir, 'atlas.png'))
  const replacement = path.join(root, 'outside.json')
  fs.writeFileSync(replacement, JSON.stringify(manifest('valid')))
  const originalOpen = fs.openSync

  const spy = vi.spyOn(fs, 'openSync').mockImplementation((path, flags, mode) => {
    if (path === manifestPath) {
      fs.renameSync(manifestPath, manifestPath + '.original')
      fs.symlinkSync(replacement, manifestPath)
    }

    return originalOpen(path, flags, mode)
  })

  try {
    const result = scanLocalPets(root)
    assert.deepEqual(result.pets, [])
    assert.equal(result.rejected[0]?.id, 'valid')
    assert.equal(fs.lstatSync(manifestPath).isSymbolicLink(), true)
  } finally {
    spy.mockRestore()
    fs.rmSync(root, { force: true, recursive: true })
  }
})
