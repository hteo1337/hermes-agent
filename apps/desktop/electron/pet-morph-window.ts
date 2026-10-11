import type { BrowserWindow, Rectangle, Screen } from 'electron'

import { createSerialQueue, MORPH_STEP_MS, morphSteps, recoverChatAfterFailedMorph } from './pet-overlay'
import { resolveChatRestoreBounds } from './window-state'

interface PetMorphDeps {
  getMainWindow: () => BrowserWindow | null
  getOverlayWindow: () => BrowserWindow | null
  openOverlay: (bounds: Rectangle) => void
  closeOverlay: () => void
  destroyOverlay: () => boolean
  persistChatBounds: () => void
  screen: Screen
  minimum: { width: number; height: number }
  markAppSized: (win: BrowserWindow, bounds: Rectangle) => void
  markPetSized: (win: BrowserWindow) => void
  clearPetSized: (win: BrowserWindow) => void
  isPetSized: (win: BrowserWindow) => boolean
  log: (message: string) => void
}

// One controller owns the saved chat rect and the queue: IPC calls cannot
// interleave a shrink and restore, including after an animation step rejects.
export function createPetMorphController(deps: PetMorphDeps) {
  let savedChatBounds: Rectangle | null = null
  let morphAnimTimer: ReturnType<typeof setInterval> | null = null
  const queueMorph = createSerialQueue()

  function cancelMorphAnimation() {
    if (morphAnimTimer) {
      clearInterval(morphAnimTimer)
      morphAnimTimer = null
    }
  }

  function animateWindowBounds(win: BrowserWindow, to: Rectangle, animate: boolean): Promise<boolean> {
    cancelMorphAnimation()

    const applyBounds = (rect: Rectangle) => {
      try {
        deps.markAppSized(win, rect)
        win.setBounds(rect)

        return true
      } catch {
        return false
      }
    }

    if (!animate) {
      return Promise.resolve(applyBounds(to))
    }

    const steps = morphSteps(win.getBounds(), to)

    return new Promise(resolve => {
      let i = 0

      morphAnimTimer = setInterval(() => {
        if (win.isDestroyed() || !applyBounds(steps[i])) {
          cancelMorphAnimation()
          resolve(false)

          return
        }

        i += 1

        if (i >= steps.length) {
          cancelMorphAnimation()
          resolve(true)
        }
      }, MORPH_STEP_MS)
    })
  }

  function recoverFailedPet(win: BrowserWindow) {
    if (!savedChatBounds || win.isDestroyed()) {
      return
    }

    const recovered = recoverChatAfterFailedMorph(win, savedChatBounds, deps.minimum, {
      markAppSized: deps.markAppSized,
      clearPetSized: deps.clearPetSized,
      closeOverlay: deps.closeOverlay,
      log: error => deps.log(`[pet-morph] recovery failed: ${error}`)
    })

    if (recovered) {
      savedChatBounds = null
    }
  }

  // An overlay that is still alive remains the user's retry surface. If it
  // disappeared independently, make the chat visible instead.
  function recoverFailedChat(win: BrowserWindow, to: Rectangle): Rectangle | null {
    const overlay = deps.getOverlayWindow()

    if (overlay && !overlay.isDestroyed()) {
      try {
        win.hide()
      } catch (error) {
        deps.log(`[pet-morph] could not hide incomplete chat restore: ${error}`)
      }

      return null
    }

    const recovered = recoverChatAfterFailedMorph(win, to, deps.minimum, {
      markAppSized: deps.markAppSized,
      clearPetSized: deps.clearPetSized,
      closeOverlay: deps.closeOverlay,
      log: error => deps.log(`[pet-morph] chat recovery failed: ${error}`)
    })

    if (recovered) {
      savedChatBounds = null
    }

    return recovered ? to : null
  }

  function finishChatRestore(win: BrowserWindow, to: Rectangle): Rectangle | null {
    try {
      win.setMinimumSize(deps.minimum.width, deps.minimum.height)
    } catch (error) {
      deps.log(`[pet-morph] could not restore chat minimum size: ${error}`)
    }

    try {
      if (!deps.destroyOverlay()) {
        return null
      }
    } catch (error) {
      deps.log(`[pet-morph] could not destroy overlay after chat restore: ${error}`)

      return null
    }

    deps.clearPetSized(win)
    savedChatBounds = null

    try {
      win.focus()
    } catch (error) {
      deps.log(`[pet-morph] could not focus restored chat: ${error}`)
    }

    return to
  }

  function morphToPet(bounds: Rectangle, animate: boolean): Promise<Rectangle | null> {
    return queueMorph(async () => {
      const win = deps.getMainWindow()

      if (!win || win.isDestroyed()) {
        return null
      }

      // Persist synchronously before the first shrink; a second toPet must
      // never replace the true chat bounds with pet-sized bounds.
      if (savedChatBounds === null) {
        savedChatBounds = win.getBounds()
        deps.persistChatBounds()
      }

      let landed = false

      try {
        win.setMinimumSize(1, 1)
        landed = await animateWindowBounds(win, bounds, animate)

        if (landed) {
          deps.markPetSized(win)
          win.hide()
          deps.openOverlay(bounds)
        }
      } catch {
        landed = false
      }

      if (!landed) {
        recoverFailedPet(win)

        return null
      }

      return bounds
    })
  }

  function morphToChat(animate: boolean): Promise<Rectangle | null> {
    return queueMorph(async () => {
      const win = deps.getMainWindow()

      if (!win || win.isDestroyed()) {
        return null
      }

      const overlay = deps.getOverlayWindow()
      const from = overlay && !overlay.isDestroyed() ? overlay.getBounds() : win.getBounds()
      const fallbackArea = deps.screen.getDisplayMatching(from)?.workArea ?? deps.screen.getPrimaryDisplay().workArea
      const to = resolveChatRestoreBounds(savedChatBounds ?? from, deps.screen.getAllDisplays(), fallbackArea)
      let landed = false

      try {
        win.setMinimumSize(1, 1)
        deps.markAppSized(win, from)
        win.setBounds(from)

        if (win.isMinimized()) {
          win.restore()
        }

        win.show()
        landed = await animateWindowBounds(win, to, animate)
      } catch {
        landed = false
      }

      return landed ? finishChatRestore(win, to) : recoverFailedChat(win, to)
    })
  }

  async function recoverAfterOverlayFailure(): Promise<boolean> {
    const current = deps.getMainWindow()

    if (!current || current.isDestroyed()) {
      return false
    }

    if (savedChatBounds === null && !deps.isPetSized(current)) {
      deps.closeOverlay()

      if (current.isMinimized()) {
        current.restore()
      }

      current.show()

      return true
    }

    if (await morphToChat(false)) {
      return true
    }

    const win = deps.getMainWindow()

    if (!win || win.isDestroyed()) {
      return false
    }

    // A blank overlay cannot be the retry surface used by ordinary morphs.
    const to = savedChatBounds ?? win.getBounds()

    const recovered = recoverChatAfterFailedMorph(win, to, deps.minimum, {
      markAppSized: deps.markAppSized,
      clearPetSized: deps.clearPetSized,
      closeOverlay: deps.closeOverlay,
      log: error => deps.log(`[pet-morph] renderer failure recovery failed: ${error}`)
    })

    if (recovered) {
      savedChatBounds = null
    }

    return recovered
  }

  return {
    isActive: () => {
      const win = deps.getMainWindow()

      return savedChatBounds !== null || Boolean(win && !win.isDestroyed() && deps.isPetSized(win))
    },
    morphToPet,
    morphToChat,
    recoverAfterOverlayFailure
  }
}
