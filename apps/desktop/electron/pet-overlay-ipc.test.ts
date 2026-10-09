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
    getPetOverlayWindow: () => null,
    isMorphActive: () => morphActive,
    openPetOverlay: vi.fn(),
    closePetOverlay: vi.fn(),
    morphToPet: vi.fn(async () => null),
    morphToChat: vi.fn(async () => null)
  })

  const control = listeners.get('hermes:pet-overlay:control')!

  return { control, window }
}

test('overlay reveal controls restore a morphed chat before showing it', () => {
  const { control, window } = controlWith(true)

  control({}, { type: 'toggle-app' })
  expect(window.webContents.send).toHaveBeenCalledWith('hermes:pet-overlay:control', { type: 'pop-in' })
  expect(window.show).not.toHaveBeenCalled()

  control({}, { type: 'open-app' })
  expect(window.webContents.send).toHaveBeenCalledWith('hermes:pet-overlay:control', { type: 'open-app' })
  expect(window.show).not.toHaveBeenCalled()
  expect(window.focus).not.toHaveBeenCalled()
})

test('non-morphed overlay keeps the existing window reveal behavior', () => {
  const { control, window } = controlWith(false)

  control({}, { type: 'toggle-app' })
  expect(window.show).toHaveBeenCalledTimes(1)
  expect(window.focus).toHaveBeenCalledTimes(1)
})
