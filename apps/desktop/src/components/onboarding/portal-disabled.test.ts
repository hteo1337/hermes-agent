import { describe, expect, it, vi } from 'vitest'

import { $freeTierStatus, refreshFreeTierStatus } from '@/store/free-tier'
import { makeOAuthProvider } from '@/test/oauth-provider'

import { sortProviders } from './providers'

describe('unconfigured portal', () => {
  it('omits its account provider while keeping other sign-in choices', () => {
    const providers = sortProviders([
      makeOAuthProvider('nous', 'Nous Portal'),
      makeOAuthProvider('openai-codex', 'ChatGPT')
    ])

    expect(providers.map(provider => provider.id)).toEqual(['openai-codex'])
  })

  it('does not ask the backend for a free-tier offer', async () => {
    const request = vi.fn().mockResolvedValue({ available: true, has_guest: true, notice_pending: true })
    expect(await refreshFreeTierStatus(request)).toBeNull()
    expect(request).not.toHaveBeenCalled()
    expect($freeTierStatus.get()).toBeNull()
  })
})
