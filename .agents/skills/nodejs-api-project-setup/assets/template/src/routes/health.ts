import { Router } from 'express'

export const healthRouter = Router()

/** Liveness check for load balancers and uptime monitors. */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})
