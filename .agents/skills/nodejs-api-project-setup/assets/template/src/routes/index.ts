import { Router } from 'express'

/** Versioned API routes, mounted at /api/v1. Add one router per resource here. */
export function createApiRouter(): Router {
  const router = Router()
  // router.use('/books', createBooksRouter(createInMemoryBookStore()))
  return router
}
