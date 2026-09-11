import 'dotenv/config'
import http from 'http'
import { createApp }      from './app'
import { connectDb }      from './lib/db'
import { connectRedis }   from './lib/redis'
import { createSocketServer } from './socket'
import { setIo as setNotifyIo } from './lib/notify'
import { setIo as setDealsIo }  from './modules/deals/deals.router'
import { setIo as setActivitiesIo } from './modules/activities/activities.router'
import { seedSuperAdmin } from './seed'
import { config }         from './config'
import { logger }         from './lib/logger'

async function main() {
  // 1. Connect infrastructure
  await connectDb()
  await connectRedis()

  // 2. Seed super admin if none exists
  await seedSuperAdmin()

  // 3. Build Express app
  const app        = createApp()
  const httpServer = http.createServer(app)

  // 4. Mount Socket.IO on the same HTTP server
  const io = createSocketServer(httpServer)

  // 5. Wire the Socket.IO instance into modules that need to emit events
  setNotifyIo(io)
  setDealsIo(io)
  setActivitiesIo(io)

  // 6. Start listening
  httpServer.listen(config.port, () => {
    logger.info(`API ready`, {
      port:    config.port,
      env:     config.nodeEnv,
      version: '1.0.0',
    })
  })

  // 7. Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received — shutting down gracefully')
    httpServer.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
  })

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err: err.message, stack: err.stack })
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason })
    process.exit(1)
  })
}

main().catch(err => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
