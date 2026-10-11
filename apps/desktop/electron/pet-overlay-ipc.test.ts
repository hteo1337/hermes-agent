import { beforeEach, expect, test, vi } from 'vitest'

const listeners = vi.hoisted(() => new Map<string, (...args: unknown[]) => void>())
const handlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => Promise<unknown>>())

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel, handler) => handlers.set(channel, handler)),
    on: vi.fn((channel, handler) => listeners.set(channel, handler))
  },
  screen: { getAllDisplays: vi.fn(() => []) }
}))

import { registerPetOverlayIpc } from './pet-overlay-ipc'

beforeEach(() => {
  listeners.clear()
  handlers.clear()
})

function controlWith(morphActive: boolean) {
  const overlayContents = { send: vi.fn() }
  const overlay = { focus: vi.fn(), isDestroyed: () => false, setFocusable: vi.fn(), webContents: overlayContents }

  const window = {
    isDestroyed: () => false,
    isMinimized: () => false,
    isVisible: () => false,
    show: vi.fn(),
    focus: vi.fn(),
    minimize: vi.fn(),
    webContents: { send: vi.fn() }
  }

  const closePetOverlay = vi.fn()

  registerPetOverlayIpc({
    getMainWindow: () => window as never,
    getPetOverlayWindow: () => overlay as never,
    isMorphActive: () => morphActive,
    openPetOverlay: vi.fn(),
    closePetOverlay,
    morphToPet: vi.fn(async () => null),
    morphToChat: vi.fn(async () => null)
  })

  const control = listeners.get('hermes:pet-overlay:control')!

  return { closePetOverlay, control, overlay, overlayContents, window }
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

test('a different renderer cannot control or spoof either overlay IPC direction', async () => {
  const { closePetOverlay, control, overlay, overlayContents, window } = controlWith(false)
  const foreign = { send: vi.fn() }

  control({ sender: foreign }, { type: 'chip-answer', sessionId: 's1', requestId: 'r1', choice: 'once' })
  control({ sender: foreign }, { type: 'toggle-app' })
  listeners.get('hermes:pet-overlay:set-focusable')!({ sender: foreign }, true)
  listeners.get('hermes:pet-overlay:state')!({ sender: foreign }, { state: 'spoofed' })
  expect(await handlers.get('hermes:pet-overlay:close')!({ sender: foreign })).toEqual({ ok: false })
  expect(window.webContents.send).not.toHaveBeenCalled()
  expect(window.show).not.toHaveBeenCalled()
  expect(overlay.setFocusable).not.toHaveBeenCalled()
  expect(overlayContents.send).not.toHaveBeenCalled()
  expect(closePetOverlay).not.toHaveBeenCalled()

  control({ sender: overlayContents }, { type: 'chip-answer', sessionId: 's1', requestId: 'r1', choice: 'once' })
  expect(window.webContents.send).toHaveBeenCalledWith('hermes:pet-overlay:control', {
    type: 'chip-answer',
    sessionId: 's1',
    requestId: 'r1',
    choice: 'once'
  })
  listeners.get('hermes:pet-overlay:set-focusable')!({ sender: overlayContents }, true)
  listeners.get('hermes:pet-overlay:state')!({ sender: window.webContents }, { state: 'real' })
  expect(await handlers.get('hermes:pet-overlay:close')!({ sender: window.webContents })).toEqual({ ok: true })
  expect(overlay.setFocusable).toHaveBeenCalledWith(true)
  expect(overlayContents.send).toHaveBeenCalledWith('hermes:pet-overlay:state', { state: 'real' })
  expect(closePetOverlay).toHaveBeenCalledTimes(1)
})
