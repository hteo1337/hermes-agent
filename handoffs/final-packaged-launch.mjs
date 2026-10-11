import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repo = path.resolve(import.meta.dirname, '..')
const root = fs.readFileSync(path.join(repo, 'handoffs/final-package-root.path'), 'utf8').trim()
const app = path.join(repo, 'apps/desktop/release/mac-arm64/Envoy Agent.app/Contents/MacOS/Envoy Agent')
const { startMockServer } = await import(path.join(repo, 'tests-js/scripts/mock-server.ts'))
const { writeEnvFile, writeMockProviderConfig } = await import(path.join(repo, 'tests-js/scripts/mock-provider-config.ts'))
const mock = await startMockServer()
const home = path.join(root, 'home')
writeMockProviderConfig(home, mock.url)
writeEnvFile(home, undefined, mock.url)
fs.writeFileSync(path.join(repo, 'handoffs/final-mock-url.txt'), mock.url + '\n')
const output = fs.openSync(path.join(repo, 'handoffs/final-packaged-app.log'), 'w')
const child = spawn(app, ['--remote-debugging-port=9223'], {
  cwd: repo,
  stdio: ['ignore', output, output],
  env: {
    ...process.env,
    HERMES_HOME: home,
    HERMES_RUNTIME_DIR: path.join(root, 'runtime'),
    HERMES_DESKTOP_USER_DATA_DIR: path.join(root, 'desktop'),
    HERMES_DESKTOP_IGNORE_EXISTING: '1',
  },
})
fs.writeFileSync(path.join(repo, 'handoffs/final-packaged-app.pid'), String(child.pid) + '\n')
console.log(`mock=${mock.url} app_pid=${child.pid}`)
async function stop() {
  child.kill('SIGTERM')
  fs.writeFileSync(path.join(repo, 'handoffs/final-mock-prompts.json'), JSON.stringify(mock.receivedPrompts, null, 2) + '\n')
  await mock.close()
  process.exit(0)
}
process.on('SIGTERM', () => { void stop() })
process.on('SIGINT', () => { void stop() })
child.on('exit', code => {
  fs.writeFileSync(path.join(repo, 'handoffs/final-packaged-app.exit'), String(code ?? '') + '\n')
  void stop()
})
