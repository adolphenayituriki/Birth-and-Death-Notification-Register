import { spawn } from 'node:child_process'

const commands = [
  { name: 'api', command: 'npm', args: ['run', 'server'] },
  { name: 'web', command: 'npm', args: ['run', 'dev'] },
]

const children = commands.map(({ name, command, args }) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  child.on('exit', (code) => {
    if (code !== 0) {
      for (const other of children) other.kill()
      process.exit(code || 1)
    }
  })
  return child
})

process.on('SIGINT', () => {
  for (const child of children) child.kill()
})
