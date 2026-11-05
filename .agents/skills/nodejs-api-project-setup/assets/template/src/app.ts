import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import type { Config } from './config.js'
import type { Logger } from './lib/logger.js'
import { createErrorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { requestContext } from './middleware/request-context.js'
import { healthRouter } from './routes/health.js'
import { createApiRouter } from './routes/index.js'

export interface AppDeps {
  config: Config
  logger: Logger
}

/** Builds the Express app without starting it, so tests can run it on any port. */
export function createApp({ config, logger }: AppDeps): Express {
  const app = express()

  // app.set('trust proxy', 1) // enable when running behind a reverse proxy / load balancer

  app.use(helmet())
  if (config.CORS_ORIGIN) {
    const origins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    app.use(cors({ origin: origins }))
  }
  app.use(requestContext(logger))
  app.use(express.json({ limit: '100kb' }))

  app.use(healthRouter)
  app.use('/api/v1', createApiRouter())

  app.use(notFound)
  app.use(createErrorHandler({ logger, exposeErrors: config.NODE_ENV !== 'production' }))
  return app
}
