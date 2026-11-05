import { Router } from 'express'
import { createConversationsRouter } from './conversations.js'
import { createInMemoryConversationStore } from '../services/conversation-store.js'

/** Versioned API routes, mounted at /api/v1. Add one router per resource here. */
export function createApiRouter(): Router {
  const router = Router()
  router.use('/conversations', createConversationsRouter(createInMemoryConversationStore()))
  return router
}
