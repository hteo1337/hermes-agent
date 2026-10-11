/**
 * window-state.json skips a window still at the bounds window sizing gave it,
 * but a user who moves or resizes it afterwards has placed it, and that
 * placement must be saved.
 */
import type { Rectangle } from 'electron'
import { describe, expect, it } from 'vitest'

import { clearPetSized, isAppSized, isPetSized, markAppSized, markPetSized } from './window-growth'

function placedWindow(initial: Rectangle) {
  let bounds = { ...initial }

  return {
    getNormalBounds: () => ({ ...bounds }),
    isMaximized: () => false,
    moveTo: (x: number, y: number) => {
      bounds = { ...bounds, x, y }
    }
  }
}

const GIVEN: Rectangle = { height: 642, width: 602, x: 500, y: 200 }

describe('isAppSized', () => {
  it('is true while the window sits at the bounds sizing gave it', () => {
    const win = placedWindow(GIVEN)

    markAppSized(win, GIVEN)

    expect(isAppSized(win)).toBe(true)
  })

  it('is false once the user moves the window without resizing it', () => {
    const win = placedWindow(GIVEN)

    markAppSized(win, GIVEN)
    win.moveTo(40, 60)

    expect(isAppSized(win)).toBe(false)
  })
})

describe('isPetSized', () => {
  it('stays true through a maximize, unlike isAppSized', () => {
    const win = placedWindow(GIVEN)

    markPetSized(win)
    win.isMaximized = () => true

    expect(isPetSized(win)).toBe(true)

    clearPetSized(win)
    expect(isPetSized(win)).toBe(false)
  })
})
