import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const desktop = path.resolve(import.meta.dirname, '..')
const repository = path.resolve(desktop, '../..')

export function stageBootstrapSource(root = repository, output = path.join(desktop, 'build/bootstrap-source.git')) {
  const stamp = JSON.parse(fs.readFileSync(path.join(desktop, 'build/install-stamp.json'), 'utf8'))
  const branch = stamp.branch || 'main'
  const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  git(['check-ref-format', '--branch', branch])
  const head = git(['rev-parse', 'HEAD'])
  if (stamp.commit !== head && !/^0{7,40}$/.test(stamp.commit)) {
    throw new Error('Bootstrap source does not match the desktop install stamp')
  }
  fs.mkdirSync(path.dirname(output), { recursive: true })
  git(['init', '--bare', output])
  git(['fetch', '--depth=1', pathToFileURL(root).href, `+HEAD:refs/heads/${branch}`], output)
  git(['symbolic-ref', 'HEAD', `refs/heads/${branch}`], output)
  if (git(['rev-parse', 'HEAD'], output) !== head) throw new Error('Bundled bootstrap source has the wrong commit')
  for (const name of ['install.sh', 'install.ps1']) {
    const source = fs.readFileSync(path.join(root, 'scripts', name), 'utf8')
    const matches = source.match(/--filter=blob:none --(?:branch|no-checkout)/g) || []
    if (matches.length !== 2) throw new Error(`Unexpected clone options in ${name}`)
    const local = source.replaceAll('--filter=blob:none --', '--')
    fs.writeFileSync(path.join(desktop, 'build', `bootstrap-${name}`), local, { mode: 0o755 })
  }
  return output
}
