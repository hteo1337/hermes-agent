import { afterEach, describe, expect, it, vi } from 'vitest'

import { $gateway } from '@/store/gateway'
import * as prompts from '@/store/prompts'

import { answerPetChip, petChipsFrom } from './pet-chips'

vi.mock('@/store/prompts', async importOriginal => ({
  ...(await importOriginal<typeof prompts>()),
  answerApproval: vi.fn(async () => undefined)
}))

const ask = (sessionId: string, requestId: string | undefined, command = 'rm -rf /tmp/x') => ({
  command,
  description: '',
  requestId,
  sessionId
})

describe('petChipsFrom', () => {
  it('lets an approval replace the working chip of the same session only', () => {
    const chips = petChipsFrom(['a', 'b'], { a: ask('a', 'r1') }, [
      { id: 'a', title: 'Alpha' },
      { id: 'b', title: 'Beta' }
    ])

    expect(chips.map(c => [c.kind, c.sessionId, c.title])).toEqual([
      ['approval', 'a', 'Alpha'],
      ['working', 'b', 'Beta']
    ])
  })

  it('skips approvals without a request id and falls back to preview, then a generic title', () => {
    const chips = petChipsFrom(['a', 'b'], { c: ask('c', undefined) }, [{ id: 'a', preview: ' two\nlines ' }])

    expect(chips.map(c => c.title)).toEqual(['two lines', 'Session'])
    expect(chips.every(c => c.kind === 'working')).toBe(true)
  })
})

describe('answerPetChip', () => {
  afterEach(() => {
    prompts.clearApprovalRequest()
    $gateway.set(null)
    vi.mocked(prompts.answerApproval).mockClear()
  })

  it('answers once for a queued request and refuses broader or unknown answers', async () => {
    $gateway.set({} as never)
    prompts.setApprovalRequest(ask('s1', 'r1'))

    expect(await answerPetChip('s1', 'r1', 'always')).toBe(false)
    expect(await answerPetChip('s1', 'r1', 'session')).toBe(false)
    expect(await answerPetChip('s1', 'gone', 'once')).toBe(false)
    expect(prompts.answerApproval).not.toHaveBeenCalled()

    expect(await answerPetChip('s1', 'r1', 'once')).toBe(true)
    expect(prompts.answerApproval).toHaveBeenCalledTimes(1)
    expect(vi.mocked(prompts.answerApproval).mock.calls[0]?.[2]).toBe('once')
    expect(await answerPetChip('s1', 'r1', 'once')).toBe(false)
  })
})
