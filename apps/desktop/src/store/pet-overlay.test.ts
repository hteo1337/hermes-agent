import { afterEach, expect, test, vi } from 'vitest'

import { $petOverlayActive, popInPet } from './pet-overlay'

afterEach(() => {
  $petOverlayActive.set(false)
  delete (window as { hermesDesktop?: unknown }).hermesDesktop
})

test('failed chat restoration keeps the pet active until a retry succeeds', async () => {
  const morphToChat = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true })

  ;(window as { hermesDesktop?: unknown }).hermesDesktop = { petOverlay: { morphToChat } }
  $petOverlayActive.set(true)

  expect(await popInPet()).toBe(false)
  expect($petOverlayActive.get()).toBe(true)

  expect(await popInPet()).toBe(true)
  expect($petOverlayActive.get()).toBe(false)
  expect(morphToChat).toHaveBeenCalledTimes(2)
})
