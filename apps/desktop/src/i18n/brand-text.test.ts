import { describe, expect, it } from 'vitest'

import { BRAND } from '@/brand'

import { brandText, brandTranslations } from './brand-text'
import { TRANSLATIONS } from './catalog'

const collect = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') {
    out.push(value)
  } else if (Array.isArray(value)) {
    value.forEach(v => collect(v, out))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(v => collect(v, out))
  }

  return out
}

describe('brandText', () => {
  it('renames the product and the vendor in prose', () => {
    expect(brandText('Hermes Agent is ready.')).toBe(`${BRAND.name} is ready.`)
    expect(brandText('Ask Hermes anything.')).toBe(`Ask ${BRAND.name} anything.`)
    expect(brandText('Sign in with Nous Portal')).toBe(`Sign in with ${BRAND.name} Portal`)
    expect(brandText('Nous Research needs this.')).toBe(`${BRAND.name} needs this.`)
  })

  it('keeps names the backend owns', () => {
    const kept = [
      'Run `hermes update` first',
      'Stored in ~/.hermes/config.yaml',
      'Set HERMES_HOME to move it',
      'See https://hermes-agent.nousresearch.com/docs',
      'Run hermes serve to start it'
    ]

    for (const text of kept) {
      expect(brandText(text)).toBe(text)
    }
  })

  it('is applied through functions, arrays and objects', () => {
    const t = brandTranslations({ a: ['Hermes'], b: (n: number) => `Hermes ${n}` })

    expect(t.a[0]).toBe(BRAND.name)
    expect(t.b(2)).toBe(`${BRAND.name} 2`)
  })

  it('leaves no vendor name in any bundled catalog', () => {
    const leaks = Object.entries(TRANSLATIONS).flatMap(([locale, catalog]) =>
      collect(brandTranslations(catalog))
        .filter(s => /\bNous\b/.test(s.replace(/https?:\/\/\S+|`[^`]*`/g, '')))
        .map(s => `${locale}: ${s.slice(0, 80)}`)
    )

    expect(leaks).toEqual([])
  })
})
