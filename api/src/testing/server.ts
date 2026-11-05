import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Express } from 'express'
import { createApp } from '../app.js'
import type { Config } from '../config.js'
import { createLogger } from '../lib/logger.js'

export const testConfig: Config = { NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'silent' }

export interface TestServer {
  baseUrl: string
  close: () => Promise<void>
}

/** Starts an app on a random free port. Use with fetch() in tests; no extra libraries needed. */
export async function startTestServer(
  app: Express = createApp({ config: testConfig, logger: createLogger(testConfig) }),
): Promise<TestServer> {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const { port } = server.address() as AddressInfo
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
