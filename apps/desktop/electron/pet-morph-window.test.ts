import assert from 'node:assert/strict'

import { test, vi } from 'vitest'

import { createPetMorphController } from './pet-morph-window'

const chat = { x: 100, y: 80, width: 1200, height: 800 }
const pet = { x: 250, y: 180, width: 240, height: 300 }
const area = { x: 0, y: 0, width: 1920, height: 1040 }

function setup(openThrows = false) {
  let bounds = { ...chat }
  let visible = true
  let petSized = false
  let overlay: null | { isDestroyed: () => boolean; getBounds: () => typeof pet } = null

  const win = {
    getBounds: () => ({ ...bounds }),
    setBounds: vi.fn(next => {
      bounds = { ...next }
    }),
    setMinimumSize: vi.fn(),
    isDestroyed: () => false,
    isMinimized: () => false,
    hide: vi.fn(() => {
      visible = false
    }),
    show: vi.fn(() => {
      visible = true
    }),
    focus: vi.fn()
  }

  const persistChatBounds = vi.fn()

  const closeOverlay = vi.fn(() => {
    overlay = null
  })

  const controller = createPetMorphController({
    getMainWindow: () => win as never,
    getOverlayWindow: () => overlay as never,
    openOverlay: () => {
      if (openThrows) {
        throw new Error('overlay creation failed')
      }
      overlay = { isDestroyed: () => false, getBounds: () => pet }
    },
    closeOverlay,
    persistChatBounds,
    screen: {
      getAllDisplays: () => [{ workArea: area }],
      getDisplayMatching: () => ({ workArea: area }),
      getPrimaryDisplay: () => ({ workArea: area })
    } as never,
    minimum: { width: 400, height: 620 },
    markAppSized: vi.fn(),
    markPetSized: () => {
      petSized = true
    },
    clearPetSized: () => {
      petSized = false
    },
    isPetSized: () => petSized,
    log: vi.fn()
  })

  return {
    controller,
    win,
    persistChatBounds,
    closeOverlay,
    bounds: () => bounds,
    visible: () => visible,
    overlay: () => overlay
  }
}

test('overlay creation throw restores chat geometry and visibility', async () => {
  const state = setup(true)

  assert.equal(await state.controller.morphToPet(pet, false), null)
  assert.deepEqual(state.bounds(), chat)
  assert.equal(state.visible(), true)
  assert.equal(state.controller.isActive(), false)
  assert.equal(state.persistChatBounds.mock.calls.length, 1)
  assert.equal(state.closeOverlay.mock.calls.length, 1)
})

test('failed reverse morph keeps overlay and saved chat bounds for retry', async () => {
  const state = setup()
  assert.deepEqual(await state.controller.morphToPet(pet, false), pet)
  assert.equal(state.visible(), false)

  state.win.setBounds.mockImplementationOnce(() => {
    throw new Error('native setBounds failed')
  })
  assert.equal(await state.controller.morphToChat(false), null)
  assert.ok(state.overlay())
  assert.equal(state.controller.isActive(), true)
  assert.equal(state.visible(), false)

  assert.deepEqual(await state.controller.morphToChat(false), chat)
  assert.deepEqual(state.bounds(), chat)
  assert.equal(state.visible(), true)
  assert.equal(state.controller.isActive(), false)
  assert.equal(state.closeOverlay.mock.calls.length, 1)
})
