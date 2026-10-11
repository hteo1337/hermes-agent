#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseline = path.join(root, 'egress-audit.baseline.json')
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css'])
const upstream =
  /(?:portal|hermes-agent|hermes-assets|[a-z0-9-]+)\.nousresearch\.com|nousresearch\.github\.io|(?:raw\.)?github(?:usercontent)?\.com\/NousResearch\/hermes-agent|api\.github\.com\/repos\/NousResearch\/hermes-agent|NousResearch\/hermes-agent|[a-z0-9-]+\.r2\.dev/gi
const forbidden =
  /(?:api\.individual\.githubcopilot\.com|api\.githubcopilot\.com|api\.github\.com|telemetry\.individual\.githubcopilot\.com|fonts\.googleapis\.com|models\.dev)/gi

function* files(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const name = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build'].includes(entry.name)) yield* files(name)
    } else if (extensions.has(path.extname(name)) && !/\.(?:test|spec|e2e)\.[cm]?[jt]sx?$/.test(name)) {
      yield name
    }
  }
}

function joinLiteralFragments(text) {
  let joined = text
  for (;;) {
    const next = joined.replace(/(['"`])\s*\+\s*(['"`])/g, '')
    if (next === joined) return joined
    joined = next
  }
}

export function count(text) {
  return [...joinLiteralFragments(text).matchAll(upstream)].length
}

export function audit() {
  const counts = {}
  for (const dir of ['src', 'electron', 'scripts']) {
    for (const file of files(dir)) {
      const hits = count(fs.readFileSync(path.join(root, file), 'utf8'))
      if (hits) counts[file] = hits
    }
  }
  for (const file of ['electron-builder.config.cjs', 'update-feed.cjs']) {
    const hits = count(fs.readFileSync(path.join(root, file), 'utf8'))
    if (hits) counts[file] = hits
  }
  return counts
}

export function forbiddenHosts() {
  const counts = {}
  for (const file of [...files('src'), ...files('electron'), 'index.html']) {
    const hits = [...joinLiteralFragments(fs.readFileSync(path.join(root, file), 'utf8')).matchAll(forbidden)].length
    if (hits) counts[file] = hits
  }
  return counts
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const counts = audit()
  const prohibited = forbiddenHosts()
  const total = Object.values(counts).reduce((sum, hits) => sum + hits, 0)
  if (process.argv[2] === '--write') {
    fs.writeFileSync(baseline, JSON.stringify(counts, null, 2) + '\n')
    console.log(`egress baseline: ${total} hits in ${Object.keys(counts).length} files`)
  } else if (process.argv[2] === '--check') {
    const prior = JSON.parse(fs.readFileSync(baseline, 'utf8'))
    const regressions = Object.entries(counts).filter(([file, hits]) => hits > (prior[file] ?? 0))
    for (const [file, hits] of regressions)
      console.error(`${file}: ${hits} upstream hits, baseline ${prior[file] ?? 0}`)
    console.log(`egress audit: ${total} hits in ${Object.keys(counts).length} files`)
    for (const [file, hits] of Object.entries(prohibited)) console.error(`${file}: ${hits} forbidden host references`)
    process.exitCode = regressions.length || Object.keys(prohibited).length ? 1 : 0
  } else {
    console.log(JSON.stringify(counts, null, 2))
  }
}
