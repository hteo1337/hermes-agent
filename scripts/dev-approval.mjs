import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import nodePath from 'node:path'

const fork = nodePath.resolve(import.meta.dirname, '..')
const { startMockServer } = await import(`${fork}/tests-js/scripts/mock-server.ts`)
const { writeEnvFile, writeMockProviderConfig } = await import(`${fork}/tests-js/scripts/mock-provider-config.ts`)

const mock = await startMockServer()
const root = fs.mkdtempSync(nodePath.join(os.tmpdir(), `hermes-dev-approval-${Date.now()}`))
const hermesHome = nodePath.join(root, 'hermes-home')
const userData = nodePath.join(root, 'electron-user-data')
fs.mkdirSync(hermesHome, { recursive: true })
fs.mkdirSync(userData, { recursive: true })

writeMockProviderConfig(hermesHome, mock.url, undefined, 'approvals:\n  mode: manual\n')
writeEnvFile(hermesHome, 'test-key-inert', mock.url)
console.log(`MOCK ${mock.url}\nHOME ${hermesHome}`)

const child = spawn('npm', ['run', 'dev'], {
  cwd: `${fork}/apps/desktop`,
  stdio: 'inherit',
  env: {
    ...process.env,
    HERMES_HOME: hermesHome,
    HERMES_DESKTOP_USER_DATA_DIR: userData,
    HERMES_DESKTOP_IGNORE_EXISTING: '1',
    HERMES_DESKTOP_HERMES_ROOT: fork,
    HERMES_DESKTOP_APP_NAME: `DevApproval-${Date.now()}`,
    ELECTRON_EXTRA_LAUNCH_ARGS: '--remote-debugging-port=9222'
  }
})
child.on('exit', code => {
  void mock.close()
  fs.rmSync(root, { recursive: true, force: true })
  process.exit(code ?? 0)
})
