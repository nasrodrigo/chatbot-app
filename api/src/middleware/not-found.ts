import type { RequestHandler } from 'express'
import { HttpError } from '../lib/http-error.js'

/** Mounted after all routes; turns unmatched requests into a JSON 404. */
export const notFound: RequestHandler = (req) => {
  throw new HttpError(404, `Route not found: ${req.method} ${req.path}`, { code: 'not_found' })
}
