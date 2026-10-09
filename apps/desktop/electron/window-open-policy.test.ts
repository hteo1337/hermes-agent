// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import {
  isHermesHubClipboardWrite,
  isHermesHubExternalUrl,
  isHermesHubOrigin
} from './hub-iframe-policy'
import { createWindowOpenHandler, describeDeniedUrl } from './window-open-policy'

const HUB_URL = 'https://hub.example.test/docs/skills?embed=picker'
const HUB_ORIGIN = 'https://hub.example.test'

describe('hub-iframe-policy predicates', () => {
  it('admits only a configured hub origin and none by default', () => {
    expect(isHermesHubOrigin(HUB_ORIGIN)).toBe(false)
    expect(isHermesHubOrigin(HUB_ORIGIN, HUB_URL)).toBe(true)
    expect(isHermesHubOrigin('https://other.example', HUB_URL)).toBe(false)

    // Opaque sandboxed frames, data URLs, look-alikes, and absent origins
    // never qualify.
    expect(isHermesHubOrigin('null')).toBe(false)
    expect(isHermesHubOrigin('')).toBe(false)
    expect(isHermesHubOrigin(null)).toBe(false)
    expect(isHermesHubOrigin(undefined)).toBe(false)
    expect(isHermesHubOrigin('https://hermes-agent.nousresearch.com.evil.example')).toBe(false)
    expect(isHermesHubOrigin('https://evil.example')).toBe(false)
    expect(isHermesHubOrigin('file://')).toBe(false)
  })

  it('delegates only http/https/mailto external URLs', () => {
    expect(isHermesHubExternalUrl('https://github.com/NousResearch/hermes-agent')).toBe(true)
    expect(isHermesHubExternalUrl('http://example.com/docs')).toBe(true)
    expect(isHermesHubExternalUrl('mailto:support@example.com')).toBe(true)

    expect(isHermesHubExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isHermesHubExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isHermesHubExternalUrl('hermes://internal')).toBe(false)
    expect(isHermesHubExternalUrl('not a url')).toBe(false)
  })

  it('grants clipboard-write to hub origins only', () => {
    expect(isHermesHubClipboardWrite(HUB_ORIGIN)).toBe(false)
    expect(isHermesHubClipboardWrite(HUB_ORIGIN, HUB_URL)).toBe(true)
    expect(isHermesHubClipboardWrite('null')).toBe(false)
    expect(isHermesHubClipboardWrite('https://artifact-preview.invalid')).toBe(false)
    expect(isHermesHubClipboardWrite(null)).toBe(false)
  })
})

describe('createWindowOpenHandler trusted-hub delegation', () => {
  const baseDetails = { url: 'https://github.com/NousResearch/hermes-agent' }

  it('still denies artifact frames (opaque origin) with NO external open', () => {
    const openExternalUrl = vi.fn()

    const handler = createWindowOpenHandler(undefined, {
      getOpenerOrigin: () => 'null',
      openExternalUrl
    })

    expect(handler(baseDetails)).toEqual({ action: 'deny' })
    expect(openExternalUrl).not.toHaveBeenCalled()
  })

  it('delegates a hub-origin http(s) open but still denies the window', () => {
    const openExternalUrl = vi.fn()

    const handler = createWindowOpenHandler(undefined, {
      getOpenerOrigin: () => HUB_ORIGIN,
      hubUrl: HUB_URL,
      openExternalUrl
    })

    expect(handler(baseDetails)).toEqual({ action: 'deny' })
    expect(openExternalUrl).toHaveBeenCalledExactlyOnceWith('https://github.com/NousResearch/hermes-agent')
  })

  it('denies an unconfigured second hub origin', () => {
    const openExternalUrl = vi.fn()

    const handler = createWindowOpenHandler(undefined, {
      getOpenerOrigin: () => 'https://other.example',
      hubUrl: HUB_URL,
      openExternalUrl
    })

    expect(handler({ url: 'https://docs.example.com/x' })).toEqual({ action: 'deny' })
    expect(openExternalUrl).not.toHaveBeenCalled()
  })

  it('never delegates file:// or unknown schemes from a hub-origin opener', () => {
    const openExternalUrl = vi.fn()

    const handler = createWindowOpenHandler(undefined, {
      getOpenerOrigin: () => HUB_ORIGIN,
      hubUrl: HUB_URL,
      openExternalUrl
    })

    expect(handler({ url: 'file:///C:/x.html' })).toEqual({ action: 'deny' })
    expect(handler({ url: 'javascript:alert(1)' })).toEqual({ action: 'deny' })
    expect(handler({ url: 'not a url' })).toEqual({ action: 'deny' })
    expect(openExternalUrl).not.toHaveBeenCalled()
  })

  it('never delegates when the opener origin is not exactly the hub', () => {
    const openExternalUrl = vi.fn()

    const handler = createWindowOpenHandler(undefined, {
      getOpenerOrigin: () => 'https://hermes-agent.nousresearch.com.evil.example',
      openExternalUrl
    })

    expect(handler(baseDetails)).toEqual({ action: 'deny' })
    expect(openExternalUrl).not.toHaveBeenCalled()
  })

  it('a throwing opener probe or external open stays deny-only', () => {
    const openExternalUrl = vi.fn(() => {
      throw new Error('boom')
    })

    const throwingProbe = createWindowOpenHandler(undefined, {
      getOpenerOrigin: () => {
        throw new Error('probe failed')
      },
      openExternalUrl
    })

    expect(throwingProbe(baseDetails)).toEqual({ action: 'deny' })
    expect(openExternalUrl).not.toHaveBeenCalled()

    const throwingOpen = createWindowOpenHandler(undefined, {
      getOpenerOrigin: () => HUB_ORIGIN,
      hubUrl: HUB_URL,
      openExternalUrl
    })

    expect(throwingOpen(baseDetails)).toEqual({ action: 'deny' })
  })

  it('a throwing logging observer cannot change the decision or the delegation', () => {
    const openExternalUrl = vi.fn()

    const handler = createWindowOpenHandler(
      () => {
        throw new Error('log failed')
      },
      { getOpenerOrigin: () => HUB_ORIGIN, hubUrl: HUB_URL, openExternalUrl }
    )

    expect(handler(baseDetails)).toEqual({ action: 'deny' })
    expect(openExternalUrl).toHaveBeenCalledOnce()
  })

  it('without trusted options the handler is side-effect-free deny (CVE-2026-70608 posture)', () => {
    const handler = createWindowOpenHandler()

    expect(handler({ url: 'https://anything.example' })).toEqual({ action: 'deny' })
  })
})

describe('describeDeniedUrl', () => {
  it('logs origin only, never the full URL', () => {
    expect(describeDeniedUrl('https://example.com/path?token=secret')).toBe('https://example.com')
    expect(describeDeniedUrl('data:text/html,foo')).toBe('data:')
    expect(describeDeniedUrl('not a url')).toBe('<unparseable>')
  })
})
