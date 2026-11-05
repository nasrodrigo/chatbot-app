import { pino, type Logger } from 'pino'
import type { Config } from '../config.js'

export type { Logger }

export function createLogger(config: Pick<Config, 'NODE_ENV' | 'LOG_LEVEL'>): Logger {
  return pino({
    level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
    // Human-readable logs only in development; production stays JSON for log collectors.
    ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
  })
}
