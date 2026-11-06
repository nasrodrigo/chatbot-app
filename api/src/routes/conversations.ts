import { Router } from 'express'
import { z } from 'zod'
import { HttpError } from '../lib/http-error.js'
import type { ConversationStore } from '../services/conversation-store.js'

const createConversationInput = z.object({
  title: z.string().trim().min(1).max(200).optional(),
})

const createMessageInput = z.object({
  text: z.string().trim().max(10_000),
  attachments: z.array(z.any()).optional(),
}).refine(
  input => input.text.length > 0 || (input.attachments?.length ?? 0) > 0,
  'Message must contain text or an attachment',
)

const idParams = z.object({
  id: z.string().uuid(),
})

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

const conversationNotFound = (id: string) =>
  new HttpError(404, `Conversation ${id} not found`, { code: 'not_found' })

export function createConversationsRouter(store: ConversationStore): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const { limit, offset } = listQuery.parse(req.query)
    const { items, total } = await store.list({ limit, offset })
    res.json({ items, total, limit, offset })
  })

  router.get('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params)
    const conversation = await store.get(id)
    if (!conversation) throw conversationNotFound(id)
    res.json(conversation)
  })

  router.post('/', async (req, res) => {
    const input = createConversationInput.parse(req.body)
    const conversation = await store.create(input.title)
    res.status(201).location(`/api/v1/conversations/${conversation.id}`).json(conversation)
  })

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params)
    const removed = await store.remove(id)
    if (!removed) throw conversationNotFound(id)
    res.status(204).end()
  })

  router.post('/:id/messages', async (req, res) => {
    const { id } = idParams.parse(req.params)
    const input = createMessageInput.parse(req.body)
    const conversation = await store.addMessage(id, input)
    if (!conversation) throw conversationNotFound(id)

    const messages = conversation.messages
    res.status(201).json({
      conversationId: id,
      userMessage: messages.at(-2),
      assistantMessage: messages.at(-1),
    })
  })

  return router
}
