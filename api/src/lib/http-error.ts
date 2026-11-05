/** Throw from any handler to produce a specific HTTP error response. */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, message: string, options: { code?: string; details?: unknown } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = options.code ?? 'error'
    this.details = options.details
  }
}
