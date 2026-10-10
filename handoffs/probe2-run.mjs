import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const repo = path.resolve(import.meta.dirname, '..')
const prefix = path.join(repo, 'handoffs/probe2')
const app = path.join(repo, 'apps/desktop/release/mac-arm64/Envoy Agent.app/Contents/MacOS/Envoy Agent')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-egress-probe2-'))
const { startMockServer } = await import(path.join(repo, 'tests-js/scripts/mock-server.ts'))
const { writeEnvFile, writeMockProviderConfig } = await import(path.join(repo, 'tests-js/scripts/mock-provider-config.ts'))
const mock = await startMockServer()
writeMockProviderConfig(path.join(root, 'home'), mock.url)
writeEnvFile(path.join(root, 'home'), undefined, mock.url)

const proxyLog = fs.openSync(`${prefix}-proxy.jsonl`, 'w')
const proxy = http.createServer((req, res) => {
  fs.writeSync(proxyLog, `${JSON.stringify({ time: new Date().toISOString(), method: req.method, target: req.url, host: req.headers.host })}\n`)
  res.writeHead(502).end('Blocked by egress probe\n')
})
proxy.on('connect', (req, socket) => {
  fs.writeSync(proxyLog, `${JSON.stringify({ time: new Date().toISOString(), method: 'CONNECT', target: req.url, host: req.headers.host })}\n`)
  socket.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
})
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve))
const port = proxy.address().port
const proxyUrl = `http://127.0.0.1:${port}`
const env = {
  ...process.env,
  HERMES_HOME: path.join(root, 'home'),
  HERMES_RUNTIME_DIR: path.join(root, 'runtime'),
  HERMES_DESKTOP_USER_DATA_DIR: path.join(root, 'desktop'),
  HERMES_DESKTOP_IGNORE_EXISTING: '1',
  HTTP_PROXY: proxyUrl, HTTPS_PROXY: proxyUrl, ALL_PROXY: proxyUrl,
  http_proxy: proxyUrl, https_proxy: proxyUrl, all_proxy: proxyUrl,
  NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1',
}
fs.writeFileSync(`${prefix}-root.path`, `${root}\n`)
fs.writeFileSync(`${prefix}-ports.json`, `${JSON.stringify({ proxy: port, mock: mock.port })}\n`)
// The positive control must differ from the NO_PROXY treatment before app launch.
async function curl(args) {
  const child = spawn('curl', args)
  let output = ''
  child.stdout.on('data', data => { output += data })
  await new Promise(resolve => child.on('exit', resolve))
  return output
}
const control = await curl(['-sS', '-o', '/dev/null', '-w', '%{http_code}', '--proxy', proxyUrl, '--noproxy', '', 'http://example.invalid/positive-control'])
await curl(['-sS', '-o', '/dev/null', '--proxy', proxyUrl, '--noproxy', '', 'https://example.invalid/positive-control'])
const beforeMock = fs.readFileSync(`${prefix}-proxy.jsonl`, 'utf8').trim().split('\n').length
const mockControl = await curl(['-sS', '-o', '/dev/null', '-w', '%{http_code}', '--proxy', proxyUrl, '--noproxy', '127.0.0.1', `${mock.url}/v1/models`])
const afterMock = fs.readFileSync(`${prefix}-proxy.jsonl`, 'utf8').trim().split('\n').length
fs.writeFileSync(`${prefix}-controls.json`, `${JSON.stringify({ httpStatus: control, mockStatus: mockControl, proxyCountBeforeMock: beforeMock, proxyCountAfterMock: afterMock })}\n`)

const captures = []
for (const iface of ['en0', 'lo0']) {
  const out = fs.openSync(`${prefix}-dns-${iface}.log`, 'w')
  captures.push(spawn('sudo', ['-n', 'tcpdump', '-i', iface, '-n', '-l', 'port 53 or port 853'], { stdio: ['ignore', out, out] }))
}
const out = fs.openSync(`${prefix}-app.log`, 'w')
const child = spawn(app, [`--proxy-server=${proxyUrl}`, '--remote-debugging-port=9224'], { cwd: repo, env, stdio: ['ignore', out, out] })
fs.writeFileSync(`${prefix}-app.pid`, `${child.pid}\n`)
console.log(JSON.stringify({ appPid: child.pid, proxyPort: port, mockPort: mock.port, root, control, mockControl, beforeMock, afterMock }))

const socketLog = fs.openSync(`${prefix}-lsof.log`, 'w')
let samples = 0
const timer = setInterval(() => {
  try {
    const ps = execFileSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' }).trim().split('\n').map(line => line.trim().split(/\s+/).map(Number))
    const pids = new Set([child.pid])
    for (let i = 0; i < 8; i++) for (const [pid, ppid] of ps) if (pids.has(ppid)) pids.add(pid)
    for (const pid of pids) {
      const lsof = spawn('lsof', ['-nP', '-a', '-p', String(pid), '-i'])
      lsof.stdout.on('data', data => fs.writeSync(socketLog, `${new Date().toISOString()} pid=${pid} ${data}`))
    }
    samples++
  } catch (error) { fs.writeSync(socketLog, `sampler error: ${error.message}\n`) }
}, 1000)

let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  clearInterval(timer)
  child.kill('SIGTERM')
  for (const capture of captures) capture.kill('SIGINT')
  fs.writeFileSync(`${prefix}-mock-prompts.json`, `${JSON.stringify(mock.receivedPrompts, null, 2)}\n`)
  fs.writeFileSync(`${prefix}-samples.count`, `${samples}\n`)
  await mock.close()
  await new Promise(resolve => proxy.close(resolve))
  process.exit(0)
}
process.on('SIGTERM', () => { void stop() })
process.on('SIGINT', () => { void stop() })
child.on('exit', code => {
  fs.writeFileSync(`${prefix}-app.exit`, `${code ?? ''}\n`)
  void stop()
})
