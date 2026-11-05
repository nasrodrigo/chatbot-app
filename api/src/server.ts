import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createLogger } from './lib/logger.js'

const config = loadConfig()
const logger = createLogger(config)
const app = createApp({ config, logger })

const server = app.listen(config.PORT, '0.0.0.0', () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'server listening')
})

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down')
  // Stop accepting new connections, let in-flight requests finish, then exit.
  server.close((err) => process.exit(err ? 1 : 0))
  server.closeIdleConnections()
  setTimeout(() => {
    logger.error('forced shutdown after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandled promise rejection')
  process.exit(1)
})
