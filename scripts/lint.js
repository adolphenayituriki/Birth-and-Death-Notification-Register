import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['client/src', 'server', 'scripts']
const files = []

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(js|jsx)$/.test(path)) files.push(path)
  }
}

for (const root of roots) walk(root)

let failures = 0

for (const file of files) {
  const source = readFileSync(file, 'utf8')

  if (/\bTODO:|\bFIXME:/.test(source)) {
    console.error(`${file}: contains TODO/FIXME marker`)
    failures += 1
  }

  if (file.startsWith('client') && /console\.(log|debug)/.test(source)) {
    console.error(`${file}: contains a console statement`)
    failures += 1
  }

  if (file.startsWith('server') || file.startsWith('scripts')) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    } catch (error) {
      console.error(`${file}: ${error.stderr?.toString().trim() || 'syntax error'}`)
      failures += 1
    }
  }
}

if (failures > 0) {
  console.error(`\nLint failed with ${failures} issue(s).`)
  process.exit(1)
}

console.log(`Lint passed for ${files.length} files.`)
