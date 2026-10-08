import { BRAND } from '@/brand'

// Commands, env vars, paths and URLs stay: the backend still owns those names.
const PROTECTED =
  /`[^`]*`|https?:\/\/\S+|~?\/?\.hermes\b\S*|\bHERMES_[A-Z0-9_]+|\bhermes(?:[-_][a-z0-9_-]+|\s+(?:serve|update|dashboard|gateway|setup|config|doctor|model|tools|skills|chat|--\S+)\b)|\bhermes\b(?=[\s.,:;)]*$)/g

// Private-use code point: never occurs in catalog text, survives the rule passes.
const MARK = String.fromCharCode(0xe000)
const RESTORE = new RegExp(`${MARK}(\\d+)${MARK}`, 'g')

const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bNous Research\b/g, 'the provider'],
  [/\bNous Portal\b/g, 'the portal'],
  [/\bNous (account|accounts|subscription|service|free tier|staff)\b/g, 'portal $1'],
  [/\bNous\b/g, 'the portal'],
  [/\bHermes Agent\b/g, BRAND.name],
  [/\bHermes\b/g, BRAND.name]
]

export function brandText(text: string): string {
  if (!/Hermes|Nous/.test(text)) {
    return text
  }

  const kept: string[] = []
  let out = text.replace(PROTECTED, m => `${MARK}${kept.push(m) - 1}${MARK}`)

  for (const [re, to] of RULES) {
    out = out.replace(re, to)
  }

  out = out.replace(
    /(^|[.!?]\s+)((?:the )?(?:portal|provider))\b/g,
    (_, lead: string, w: string) => lead + w[0].toUpperCase() + w.slice(1)
  )

  return out.replace(RESTORE, (_, i: string) => kept[Number(i)])
}

export function brandTranslations<T>(value: T): T {
  if (typeof value === 'string') {
    return brandText(value) as T
  }

  if (typeof value === 'function') {
    const fn = value as unknown as (...args: unknown[]) => unknown

    return ((...args: unknown[]) => brandTranslations(fn(...args))) as T
  }

  if (Array.isArray(value)) {
    return value.map(brandTranslations) as T
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, brandTranslations(v)])) as T
  }

  return value
}
