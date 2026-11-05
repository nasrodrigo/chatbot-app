// Copy to src/routes/books.ts, then mount it in src/routes/index.ts:
//   router.use('/books', createBooksRouter(createInMemoryBookStore()))
import { Router } from 'express'
import { z } from 'zod'
import { HttpError } from '../lib/http-error.js'
import type { BookStore } from '../services/book-store.js'

const bookInput = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
})
const idParams = z.object({ id: z.string().uuid() })
const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

const bookNotFound = (id: string) =>
  new HttpError(404, `Book ${id} not found`, { code: 'not_found' })

// Express 5 forwards thrown errors and rejected promises from async handlers to the error
// middleware, so handlers just throw: ZodError -> 400, HttpError -> its status.
export function createBooksRouter(store: BookStore): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const { limit, offset } = listQuery.parse(req.query)
    const { items, total } = await store.list({ limit, offset })
    res.json({ items, total, limit, offset })
  })

  router.get('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params)
    const book = await store.get(id)
    if (!book) throw bookNotFound(id)
    res.json(book)
  })

  router.post('/', async (req, res) => {
    const input = bookInput.parse(req.body)
    const book = await store.create(input)
    res.status(201).location(`/api/v1/books/${book.id}`).json(book)
  })

  router.put('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params)
    const input = bookInput.parse(req.body)
    const book = await store.replace(id, input)
    if (!book) throw bookNotFound(id)
    res.json(book)
  })

  router.delete('/:id', async (req, res) => {
    const { id } = idParams.parse(req.params)
    const removed = await store.remove(id)
    if (!removed) throw bookNotFound(id)
    res.status(204).end()
  })

  return router
}
