import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { test } from 'vitest'

import { PET_STATES, scanLocalPets } from './local-pets'

const realAtlas = fileURLToPath(new URL('../src/components/pet/pet-egg-sheet.png', import.meta.url))

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
