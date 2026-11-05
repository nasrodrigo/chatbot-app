import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import type { Logger } from '../lib/logger.js'

const SAFE_ID = /^[\w-]{1,64}$/

/** Assigns a request id (echoed in the x-request-id header) and logs each finished request. */
export function requestContext(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const incoming = req.header('x-request-id')
    const requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID()
    res.locals.requestId = requestId
    res.setHeader('x-request-id', requestId)

    const start = process.hrtime.bigint()
    res.on('finish', () => {
      logger.info(
        {
          requestId,
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          ms: Number(process.hrtime.bigint() - start) / 1e6,
        },
        'request completed',
      )
    })
    next()
  }
}
