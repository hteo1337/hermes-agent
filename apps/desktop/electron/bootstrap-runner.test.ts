import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  buildPinArgs,
  buildPosixPinArgs,
  cleanInstallerLogLine,
  hasExistingGitCheckout,
  isPinnedCommit,
  resolveBootstrapRepository,
  resolveInstallScript,
  resolveMarkerPinnedCommit,
  runBootstrap
} from './bootstrap-runner'

const SCRIPT_NAME = process.platform === 'win32' ? 'install.ps1' : 'install.sh'
const ZERO_COMMIT = '0000000000000000000000000000000000000000'

function mkTmpHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-bootstrap-test-'))
}

test('runBootstrap bails immediately when the signal is already aborted', async () => {
  const controller = new AbortController()
  controller.abort()

  const events = []

  const result = await runBootstrap({
    installStamp: null,
    activeRoot: '/tmp/hermes-runner-test',
    sourceRepoRoot: null,
    hermesHome: '/tmp/hermes-runner-test',
    logRoot: '/tmp/hermes-runner-test',
    onEvent: ev => events.push(ev),
    abortSignal: controller.signal
  })

  // Cancelled before any install script is spawned.
  assert.deepEqual(result, { ok: false, cancelled: true })
  assert.ok(
    events.some(ev => ev.type === 'failed' && /cancelled/i.test(ev.error)),
    'should emit a cancelled failure event'
  )
})

test('existing checkout detection requires git metadata', () => {
  const home = mkTmpHome()

  try {
    const activeRoot = path.join(home, 'hermes-agent')
    assert.equal(hasExistingGitCheckout(activeRoot), false)

    fs.mkdirSync(path.join(activeRoot, '.git'), { recursive: true })
    assert.equal(hasExistingGitCheckout(activeRoot), true)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('fresh bootstrap args include the packaged commit pin', () => {
  const installStamp = { commit: 'a'.repeat(40), branch: 'main' }

  assert.deepEqual(buildPinArgs(installStamp), ['-Commit', installStamp.commit, '-Branch', 'main'])
  assert.deepEqual(
    buildPosixPinArgs({
      installStamp,
      activeRoot: '/tmp/hermes-agent',
      hermesHome: '/tmp/hermes'
    }),
    ['--dir', '/tmp/hermes-agent', '--hermes-home', '/tmp/hermes', '--branch', 'main', '--commit', installStamp.commit]
  )
})

test('existing-checkout bootstrap args keep branch but skip the packaged commit pin', () => {
  const installStamp = { commit: 'a'.repeat(40), branch: 'main' }

  assert.deepEqual(buildPinArgs(installStamp, { pinCommit: false }), ['-Branch', 'main'])
  assert.deepEqual(
    buildPosixPinArgs({
      installStamp,
      activeRoot: '/tmp/hermes-agent',
      hermesHome: '/tmp/hermes',
      pinCommit: false
    }),
    ['--dir', '/tmp/hermes-agent', '--hermes-home', '/tmp/hermes', '--branch', 'main']
  )
})

test('fallback install stamps use an unpinned branch ref', () => {
  const stamp = { commit: ZERO_COMMIT, branch: 'main' }

  assert.equal(isPinnedCommit(ZERO_COMMIT), false)
  // Must NOT pass -Commit / --commit for the all-zero placeholder.
  assert.deepEqual(buildPinArgs(stamp), ['-Branch', 'main'])
  assert.deepEqual(
    buildPosixPinArgs({
      installStamp: stamp,
      activeRoot: '/tmp/hermes',
      hermesHome: '/tmp/home'
    }),
    ['--dir', '/tmp/hermes', '--hermes-home', '/tmp/home', '--branch', 'main']
  )
})

test('resolveMarkerPinnedCommit prefers installed checkout HEAD over the packaged artifact', () => {
  const realHead = 'c'.repeat(40)
  assert.equal(
    resolveMarkerPinnedCommit({ commit: ZERO_COMMIT, branch: 'main' }, '/tmp/checkout', {
      resolveHead: () => realHead
    }),
    realHead
  )
  assert.equal(
    resolveMarkerPinnedCommit({ commit: 'd'.repeat(40), branch: 'main' }, '/tmp/checkout', {
      resolveHead: () => realHead
    }),
    realHead,
    'the installed checkout owns source runtime identity'
  )
  assert.equal(
    resolveMarkerPinnedCommit({ commit: ZERO_COMMIT, branch: 'main' }, '/tmp/missing', {
      resolveHead: () => null
    }),
    null
  )
})

test('resolveInstallScript uses only a bundled payload installer', async () => {
  const home = mkTmpHome()

  try {
    const bundled = path.join(home, 'agent-payload', 'scripts', SCRIPT_NAME)
    const local = path.join(home, 'checkout', 'scripts', SCRIPT_NAME)
    fs.mkdirSync(path.dirname(bundled), { recursive: true })
    fs.mkdirSync(path.dirname(local), { recursive: true })
    fs.writeFileSync(bundled, 'bundled installer\n')
    fs.writeFileSync(local, 'local installer\n')

    const request = {
      installStamp: { commit: 'a'.repeat(40), branch: 'main' },
      sourceRepoRoot: path.join(home, 'checkout'),
      resourcesPath: home,
      emit: () => {}
    }

    const result = await resolveInstallScript(request)

    assert.equal(result.source, 'bundled')
    assert.equal(result.path, bundled)
    assert.equal(fs.readFileSync(result.path, 'utf8'), 'bundled installer\n')
    const source = path.join(home, 'agent-payload', 'source.git')
    fs.mkdirSync(source, { recursive: true })
    fs.writeFileSync(path.join(source, 'HEAD'), 'ref: refs/heads/main\n')
    assert.equal(resolveBootstrapRepository(home, ''), source)
    assert.equal(resolveBootstrapRepository(home, 'owner/fork'), 'https://github.com/owner/fork.git')
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('resolveInstallScript fails closed when the bundled installer is missing', async () => {
  const home = mkTmpHome()

  try {
    const stale = path.join(home, 'hermes-agent', 'scripts', SCRIPT_NAME)
    fs.mkdirSync(path.dirname(stale), { recursive: true })
    fs.writeFileSync(stale, 'stale installed script\n')
    await assert.rejects(
      resolveInstallScript({ installStamp: null, resourcesPath: home, emit: () => {} }),
      /bundled installer is missing/
    )
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// #112675: install.sh colours its banners and curl/uv redraw progress with \r
// even into a pipe; the overlay renders lines as plain text, so the emitter
// must hand every consumer (log ring, Details panel, Copy output) the text a
// terminal would be left showing.
test('installer log lines reach the emitter without escape sequences; \\r redraws keep the last frame', () => {
  assert.equal(cleanInstallerLogLine('\u001b[0;32m✓\u001b[0m Detected: macos (macos)'), '✓ Detected: macos (macos)')
  assert.equal(cleanInstallerLogLine('\u001b[2K\u001b[1GCloning repository…\u001b[K'), 'Cloning repository…')
  assert.equal(cleanInstallerLogLine('\u001b]0;hermes\u0007Installing Hermes'), 'Installing Hermes')
  assert.equal(cleanInstallerLogLine('\r 12%\r 67%\r100%\u001b[K'), '100%')
  assert.equal(cleanInstallerLogLine('Resolving dependencies…\r'), 'Resolving dependencies…')
  // Only-escape frames drop entirely, so the caller emits nothing for them.
  assert.equal(cleanInstallerLogLine('\u001b[0m\r'), '')
  // Plain multi-byte text is untouched.
  assert.equal(cleanInstallerLogLine('Ready — café ✓ 中文'), 'Ready — café ✓ 中文')
})

test.skipIf(process.platform === 'win32')(
  'a manifest-step failure surfaces the installer tail without escape sequences',
  async () => {
    const home = mkTmpHome()
    fs.mkdirSync(path.join(home, 'scripts'))
    fs.mkdirSync(path.join(home, '.git'))
    const bundled = path.join(home, 'agent-payload', 'scripts', 'install.sh')
    fs.mkdirSync(path.dirname(bundled), { recursive: true })
    fs.mkdirSync(path.join(home, 'agent-payload', 'source.git'))
    fs.writeFileSync(path.join(home, 'agent-payload', 'source.git', 'HEAD'), 'ref: refs/heads/main\n')
    fs.writeFileSync(
      bundled,
      '#!/usr/bin/env bash\nprintf "\\033[0;31m\\xe2\\x9c\\x97\\033[0m manifest broke\\n" >&2\nexit 3\n'
    )
    fs.writeFileSync(path.join(home, 'scripts', 'install.sh'), 'exit 0\n')

    const result = await runBootstrap({
      installStamp: null,
      activeRoot: home,
      sourceRepoRoot: home,
      hermesHome: home,
      logRoot: home,
      resourcesPath: home,
      onEvent: () => {}
    })

    assert.equal(result.ok, false)
    assert.equal(result.error, 'install.sh --manifest failed: exit 3\n✗ manifest broke')
  }
)
