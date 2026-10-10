import { beforeEach, expect, test, vi } from 'vitest'

const listeners = vi.hoisted(() => new Map<string, (...args: unknown[]) => void>())

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn((channel, handler) => listeners.set(channel, handler))
  },
  screen: { getAllDisplays: vi.fn(() => []) }
}))

import { registerPetOverlayIpc } from './pet-overlay-ipc'

beforeEach(() => listeners.clear())

function controlWith(morphActive: boolean) {
  const overlayContents = { send: vi.fn() }
  const overlay = { isDestroyed: () => false, webContents: overlayContents }

  const window = {
    isDestroyed: () => false,
    isMinimized: () => false,
    isVisible: () => false,
    show: vi.fn(),
    focus: vi.fn(),
    minimize: vi.fn(),
    webContents: { send: vi.fn() }
  }

  registerPetOverlayIpc({
    getMainWindow: () => window as never,
    getPetOverlayWindow: () => overlay as never,
    isMorphActive: () => morphActive,
    openPetOverlay: vi.fn(),
    closePetOverlay: vi.fn(),
    morphToPet: vi.fn(async () => null),
    morphToChat: vi.fn(async () => null)
  })

  const control = listeners.get('hermes:pet-overlay:control')!

  return { control, overlayContents, window }
}

test('overlay reveal controls restore a morphed chat before showing it', () => {
  const { control, overlayContents, window } = controlWith(true)

  control({ sender: overlayContents }, { type: 'toggle-app' })
  expect(window.webContents.send).toHaveBeenCalledWith('hermes:pet-overlay:control', { type: 'pop-in' })
  expect(window.show).not.toHaveBeenCalled()

  control({ sender: overlayContents }, { type: 'open-app' })
  expect(window.webContents.send).toHaveBeenCalledWith('hermes:pet-overlay:control', { type: 'open-app' })
  expect(window.show).not.toHaveBeenCalled()
  expect(window.focus).not.toHaveBeenCalled()
})

test('non-morphed overlay keeps the existing window reveal behavior', () => {
  const { control, overlayContents, window } = controlWith(false)

  control({ sender: overlayContents }, { type: 'toggle-app' })
  expect(window.show).toHaveBeenCalledTimes(1)
  expect(window.focus).toHaveBeenCalledTimes(1)
})

test('a different renderer cannot send a chip answer or window control', () => {
  const { control, overlayContents, window } = controlWith(false)

  control({ sender: { send: vi.fn() } }, { type: 'chip-answer', sessionId: 's1', requestId: 'r1', choice: 'once' })
  control({ sender: { send: vi.fn() } }, { type: 'toggle-app' })
  expect(window.webContents.send).not.toHaveBeenCalled()
  expect(window.show).not.toHaveBeenCalled()

  control({ sender: overlayContents }, { type: 'chip-answer', sessionId: 's1', requestId: 'r1', choice: 'once' })
  expect(window.webContents.send).toHaveBeenCalledWith('hermes:pet-overlay:control', {
    type: 'chip-answer',
    sessionId: 's1',
    requestId: 'r1',
    choice: 'once'
  })
})
