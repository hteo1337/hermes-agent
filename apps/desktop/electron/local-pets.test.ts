import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import { PET_STATES, scanLocalPets } from './local-pets'

test('local pets load from user data while a symlinked atlas is rejected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-local-pets-'))
  const petsDir = path.join(root, 'pets')
  const validDir = path.join(petsDir, 'valid')
  const linkedDir = path.join(petsDir, 'linked')
  const atlas = Buffer.alloc(24)

  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(atlas)
  atlas.write('IHDR', 12, 'ascii')
  atlas.writeUInt32BE(128, 16)
  atlas.writeUInt32BE(128, 20)

  try {
    fs.mkdirSync(validDir, { recursive: true })
    fs.mkdirSync(linkedDir)

    for (const [id, dir] of [
      ['valid', validDir],
      ['linked', linkedDir]
    ]) {
      fs.writeFileSync(
        path.join(dir, 'pet.json'),
        JSON.stringify({
          id,
          frameW: 32,
          frameH: 32,
          columns: 4,
          stateRows: Object.fromEntries(PET_STATES.map((state, index) => [state, index]))
        })
      )
    }

    fs.writeFileSync(path.join(validDir, 'atlas.png'), atlas)
    fs.symlinkSync(path.join(validDir, 'atlas.png'), path.join(linkedDir, 'atlas.png'))

    const result = scanLocalPets(petsDir)

    assert.deepEqual(
      result.pets.map(pet => pet.id),
      ['valid']
    )
    assert.deepEqual(result.rejected, [{ id: 'linked', reason: 'symlinks are not allowed' }])
  } finally {
    fs.rmSync(root, { force: true, recursive: true })
  }
})
