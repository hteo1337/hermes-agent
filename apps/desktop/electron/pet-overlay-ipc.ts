// IPC surface for the pop-out pet overlay (mascot window). Extracted from
// main.ts; window handles stay injected because main.ts owns their lifecycle.
import { type BrowserWindow, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent, screen } from 'electron'

import { petOverlayClickThrough, resolvePetOverlayBounds } from './pet-overlay'

export interface PetOverlayIpcDeps {
  getMainWindow: () => BrowserWindow | null
  getPetOverlayWindow: () => BrowserWindow | null
  isMorphActive: () => boolean
  openPetOverlay: (bounds: unknown) => void
  closePetOverlay: () => void
  // toPet/toChat: morph the main window into the overlay's spot and back.
  morphToPet: (bounds: unknown, animate: boolean) => Promise<unknown>
  morphToChat: (animate: boolean) => Promise<unknown>
}

// Where the overlay may actually sit: `bounds` kept wholly on a connected
// display, or re-centered on the main window's display when it is on none
// (see resolvePetOverlayBounds). Null for garbage bounds.
export function placePetOverlay(bounds, mainWindow: BrowserWindow | null) {
  let anchor = null

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      anchor = mainWindow.getContentBounds()
    }
  } catch {
    // Resolve falls back to the primary display when the anchor is unknown.
  }

  return resolvePetOverlayBounds(bounds, screen.getAllDisplays(), anchor)
}

// A renderer rect is rejected outright, not laundered — `|| 0` on NaN silently
// becomes a valid 0, and the display clamp below only fits bad sizes, never refuses them.
const MAX_DIM = 10000

function isValidRect(bounds): boolean {
  if (!bounds) {
    return false
  }

  const { x, y, width, height } = bounds

  return (
    [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0 && width <= MAX_DIM && height <= MAX_DIM
  )
}

// `request` is `{ bounds, screen }`: viewport-space (screen=false, converted via
// the main window's content origin) or a remembered screen-space spot (screen=true).
function resolveScreenBounds(request, mainWindow: BrowserWindow | null) {
  const bounds = request && request.bounds ? request.bounds : request

  if (!isValidRect(bounds)) {
    return null
  }

  const isScreen = Boolean(request && request.screen)
  let screenBounds = bounds

  try {
    if (!isScreen && mainWindow && !mainWindow.isDestroyed()) {
      const content = mainWindow.getContentBounds()
      screenBounds = { x: content.x + bounds.x, y: content.y + bounds.y, width: bounds.width, height: bounds.height }
    }
  } catch {
    // Fall back to raw bounds if the window geometry is unavailable.
  }

  return placePetOverlay(screenBounds, mainWindow)
}

export function registerPetOverlayIpc({
  getMainWindow,
  getPetOverlayWindow,
  isMorphActive,
  openPetOverlay,
  closePetOverlay,
  morphToPet,
  morphToChat
}: PetOverlayIpcDeps) {
  const fromMain = (event: IpcMainEvent | IpcMainInvokeEvent) => {
    const win = getMainWindow()

    return Boolean(win && !win.isDestroyed() && event.sender === win.webContents)
  }

  const fromOverlay = (event: IpcMainEvent) => {
    const win = getPetOverlayWindow()

    return Boolean(win && !win.isDestroyed() && event.sender === win.webContents)
  }

  ipcMain.handle('hermes:pet-overlay:open', async (event, request) => {
    if (!fromMain(event)) {
      return { ok: false }
    }

    const screenBounds = resolveScreenBounds(request, getMainWindow())

    if (!screenBounds) {
      return { ok: false }
    }

    openPetOverlay(screenBounds)

    return { ok: true, bounds: screenBounds }
  })
  ipcMain.handle('hermes:pet-overlay:close', async event => {
    if (!fromMain(event)) {
      return { ok: false }
    }

    closePetOverlay()

    return { ok: true }
  })
  // toPet: shrink the main window into this spot, hide it, open the overlay
  // there — the chat window visibly becomes the mascot (PLAN-ENVOY-INTEGRATION A).
  ipcMain.handle('hermes:pet-overlay:morph-to-pet', async (event, request) => {
    if (!fromMain(event)) {
      return { ok: false }
    }

    const screenBounds = resolveScreenBounds(request, getMainWindow())

    if (!screenBounds) {
      return { ok: false }
    }

    try {
      const resolved = await morphToPet(screenBounds, Boolean(request?.animate))

      return resolved ? { bounds: resolved, ok: true } : { ok: false }
    } catch {
      return { ok: false }
    }
  })
  // toChat: reverse — show the main window at the overlay's spot, grow it back
  // to the saved chat bounds, then close the overlay.
  ipcMain.handle('hermes:pet-overlay:morph-to-chat', async (event, request) => {
    if (!fromMain(event)) {
      return { ok: false }
    }

    try {
      const resolved = await morphToChat(Boolean(request?.animate))

      return resolved ? { bounds: resolved, ok: true } : { ok: false }
    } catch {
      return { ok: false }
    }
  })
  // Drag/resize: the overlay reports new absolute screen bounds (it already knows
  // the pointer's screen coords). Drag keeps the size constant; the wheel-to-scale
  // gesture grows/shrinks it so the sprite is never cropped by the window edge.
  // The window is created non-resizable (no stray edge-drag on the transparent
  // frameless panel), which on Windows/Linux also blocks programmatic setBounds
  // sizing — so briefly flip resizable on whenever the size actually changes.
  ipcMain.on('hermes:pet-overlay:set-bounds', (event, bounds) => {
    if (!fromOverlay(event)) {
      return
    }

    const petOverlayWindow = getPetOverlayWindow()

    if (!petOverlayWindow || petOverlayWindow.isDestroyed() || !bounds) {
      return
    }

    const next = placePetOverlay(bounds, getMainWindow())

    if (!next) {
      return
    }

    const win = petOverlayWindow
    const { width, height } = next
    const [curW, curH] = win.getSize()
    const resizing = width !== curW || height !== curH

    if (resizing && !win.isResizable()) {
      win.setResizable(true)
    }

    win.setBounds(next)

    if (resizing) {
      win.setResizable(false)
    }
  })
  // Click-through: the overlay window is a full rectangle but only the pet pixels
  // should be interactive. The renderer toggles this as the cursor enters/leaves
  // the sprite so transparent margins pass clicks to whatever is behind.
  ipcMain.on('hermes:pet-overlay:ignore-mouse', (event, ignore) => {
    if (!fromOverlay(event)) {
      return
    }

    const petOverlayWindow = getPetOverlayWindow()

    // No forward on Linux: an ignoring overlay could never be re-armed.
    if (Boolean(ignore) && !petOverlayClickThrough()) {
      return
    }

    if (petOverlayWindow && !petOverlayWindow.isDestroyed()) {
      petOverlayWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: true })
    }
  })
  // The overlay is a non-activating panel (focusable:false) so it never steals
  // the app's cmd/alt-tab anchor from the main window. But the pop-up composer
  // needs the keyboard, so the renderer asks us to flip it focusable + focus it
  // while the composer is open, then back to non-activating when it closes.
  ipcMain.on('hermes:pet-overlay:set-focusable', (event, focusable) => {
    if (!fromOverlay(event)) {
      return
    }

    const petOverlayWindow = getPetOverlayWindow()

    if (!petOverlayWindow || petOverlayWindow.isDestroyed()) {
      return
    }

    petOverlayWindow.setFocusable(Boolean(focusable))

    if (focusable) {
      petOverlayWindow.focus()
    }
  })
  // Main renderer → overlay: forward the latest pet state for the overlay to render.
  ipcMain.on('hermes:pet-overlay:state', (event, payload) => {
    if (!fromMain(event)) {
      return
    }

    const petOverlayWindow = getPetOverlayWindow()

    if (petOverlayWindow && !petOverlayWindow.isDestroyed()) {
      petOverlayWindow.webContents.send('hermes:pet-overlay:state', payload)
    }
  })
  // Overlay → main renderer: control messages (pop back in, composer submit).
  ipcMain.on('hermes:pet-overlay:control', (event, payload) => {
    if (!fromOverlay(event)) {
      return
    }

    const mainWindow = getMainWindow()

    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    // Double-click toggles the app window: hide it away if it's up front, bring it
    // back if it's minimized/buried. Pure window control — nothing for the
    // renderer to do, so don't forward it.
    if (payload && payload.type === 'toggle-app') {
      if (isMorphActive()) {
        mainWindow.webContents.send('hermes:pet-overlay:control', { type: 'pop-in' })

        return
      }

      if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
        mainWindow.show()
        mainWindow.focus()
      } else {
        mainWindow.minimize()
      }

      return
    }

    // The mail icon means "take me to the app": raise the main window (it may be
    // minimized or buried) before the renderer navigates to the latest thread.
    if (payload && payload.type === 'open-app') {
      if (isMorphActive()) {
        mainWindow.webContents.send('hermes:pet-overlay:control', payload)

        return
      }

      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }

      mainWindow.show()
      mainWindow.focus()
    }

    // A drag/resize end reports the rect the overlay asked for; persist where
    // set-bounds actually put it (clamped on-screen), not the raw request.
    if (payload && payload.type === 'bounds') {
      payload = { ...payload, bounds: placePetOverlay(payload.bounds, mainWindow) ?? payload.bounds }
    }

    mainWindow.webContents.send('hermes:pet-overlay:control', payload)
  })
}
