#!/usr/bin/env node
// Counts upstream brand mentions (Nous / Hermes) that are NOT protocol or
// internal identifiers, per file. `--check` fails if any file gains hits
// against brand-audit.baseline.json; `--write` records the current counts.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(root, 'brand-audit.baseline.json')
const dirs = ['src', 'electron', 'public', 'index.html', 'package.json', 'electron-builder.config.cjs', 'product-identity.cjs']
const exts = new Set(['.ts', '.tsx', '.mts', '.cjs', '.mjs', '.js', '.json', '.html', '.css', '.md'])
// Locale catalogs are branded at resolve time (src/i18n/brand-text.ts) and swept by its test.
const skip = /(^|\/)(node_modules|dist|build)(\/|$)|^src\/i18n\/(?!brand-text)|\.test\.|\.e2e\.|\.d\.c?ts$/

// Identifiers the backend and tooling depend on. They are not branding.
const internal = [
  /HERMES_[A-Z0-9_]+/g, /hermes_[a-z_]+/g, /hermes-(?:agent|update|bots|media|dev|home)\b/gi,
  /hermes(?:Desktop|Home|Api|Path|Bots|Root)\w*/g, /\.hermes\b/g, /hermes\.(?:exe|desktop|bots)\b[\w.-]*/g,
  /hermes (?:serve|update|dashboard|gateway)\b/g, /\bhermes-cli\b/gi
]
const brand = /\b(?:nous(?:\s?research)?|hermes)\b/gi

function* walk(p) {
  const full = path.join(root, p)
  if (!fs.existsSync(full)) return
  const st = fs.statSync(full)
  if (st.isFile()) return yield p
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(p, e.name)
    if (skip.test(rel)) continue
    if (e.isDirectory()) yield* walk(rel)
    else if (exts.has(path.extname(e.name))) yield rel
  }
}

export function auditText(text) {
  let rest = text
  for (const re of internal) rest = rest.replace(re, ' ')
  return (rest.match(brand) || []).length
}

export function audit() {
  const counts = {}
  for (const d of dirs) for (const f of walk(d)) {
    const n = auditText(fs.readFileSync(path.join(root, f), 'utf8'))
    if (n) counts[f] = n
  }
  return counts
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const counts = audit()
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const mode = process.argv[2]
  if (mode === '--write') {
    fs.writeFileSync(baselinePath, JSON.stringify(counts, Object.keys(counts).sort(), 2) + '\n')
    console.log(`baseline written: ${total} hits in ${Object.keys(counts).length} files`)
  } else if (mode === '--check') {
    const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    const worse = Object.entries(counts).filter(([f, n]) => n > (base[f] ?? 0))
    for (const [f, n] of worse) console.error(`brand-audit: ${f} has ${n}, baseline ${base[f] ?? 0}`)
    console.log(`brand hits: ${total} in ${Object.keys(counts).length} files`)
    process.exit(worse.length ? 1 : 0)
  } else {
    for (const [f, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(5), f)
    console.log(`total: ${total} hits in ${Object.keys(counts).length} files`)
  }
}
