import { expect, it } from 'vitest'

import { noFeedStatus, resolveFeedBaseUrl } from './feed-config'

it('disables update checks when the brand has no feed', () => {
  expect(noFeedStatus('')).toEqual({
    supported: false,
    reason: 'no-update-feed',
    message: 'Updates are managed outside the app'
  })
})

it('admits a configured generic feed and refuses unsafe origins', () => {
  expect(noFeedStatus('https://mirror.example/updates')).toBeNull()
  expect(resolveFeedBaseUrl('https://mirror.example/updates')).toBe('https://mirror.example/updates')
  expect(resolveFeedBaseUrl('http://127.0.0.1:8443/feed')).toBe('http://127.0.0.1:8443/feed')

  for (const bad of [
    'http://evil.example/feed',
    'https://user:pw@mirror.example/feed',
    'https://mirror.example/../feed'
  ]) {
    expect(() => noFeedStatus(bad)).toThrow()
  }
})
