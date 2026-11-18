import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const { default: mongoose } = await import('mongoose')
const { default: app } = await import('./app.js')
const { getStorageMode, initializeStore } = await import('./store.js')

const port = Number(process.env.PORT) || 4000

try {
  const storage = await initializeStore()
  app.listen(port, () => {
    console.log(`\n  Birth & Death Register API ready`)
    console.log(`  http://localhost:${port}/api`)
    console.log(`  storage: ${storage === 'mongodb' ? 'mongodb' : 'memory fallback'}`)
    console.log(`  mode: ${getStorageMode()}\n`)
  })
} catch (error) {
  console.error('Failed to start API:', error)
  process.exit(1)
}

const shutdown = async () => {
  await mongoose.connection.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
