import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../lib/http-error.js'
import type { Logger } from '../lib/logger.js'

interface Options {
  logger: Logger
  /** Include internal error details in 5xx responses. Keep false in production. */
  exposeErrors: boolean
}

/** Reads a 4xx/5xx status from errors raised by libraries (e.g. malformed JSON from body parsing). */
function libraryStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown }
  const value = typeof status === 'number' ? status : statusCode
  return typeof value === 'number' && value >= 400 && value < 600 ? value : undefined
}

/** The single place where errors become responses. Must keep four parameters. */
export function createErrorHandler({ logger, exposeErrors }: Options): ErrorRequestHandler {
  return (err, _req, res, next) => {
    if (res.headersSent) {
      next(err)
      return
    }
    const requestId = res.locals.requestId as string | undefined

    let status = 500
    let code = 'internal_error'
    let message = 'Internal Server Error'
    let details: unknown

    if (err instanceof ZodError) {
      status = 400
      code = 'validation_error'
      message = 'Request validation failed'
      details = err.issues.map((issue) => (console.log(issue), {
        path: issue.path.map(String).join('.'),
        message: issue.message,
      }))
    } else if (err instanceof HttpError) {
      status = err.status
      code = err.code
      message = err.message
      details = err.details
    } else {
      const fromLibrary = libraryStatus(err)
      if (fromLibrary !== undefined && fromLibrary < 500) {
        status = fromLibrary
        code = 'bad_request'
        message = err instanceof Error ? err.message : 'Bad Request'
      }
    }

    if (status >= 500) {
      logger.error({ err, requestId }, 'unhandled error')
      if (exposeErrors && err instanceof Error) details = { message: err.message, stack: err.stack }
    } else {
      logger.debug({ err, requestId }, 'request failed')
    }

    res.status(status).json({ error: { code, message, details, requestId } })
  }
}
