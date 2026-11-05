// Copy to src/services/book-store.ts
import { randomUUID } from 'node:crypto'

export interface Book {
  id: string
  title: string
  author: string
  createdAt: string
}
export type BookInput = Pick<Book, 'title' | 'author'>

/** Storage boundary: replace the in-memory version with a database without touching the routes. */
export interface BookStore {
  list(options: { limit: number; offset: number }): Promise<{ items: Book[]; total: number }>
  get(id: string): Promise<Book | undefined>
  create(input: BookInput): Promise<Book>
  replace(id: string, input: BookInput): Promise<Book | undefined>
  remove(id: string): Promise<boolean>
}

export function createInMemoryBookStore(): BookStore {
  const books = new Map<string, Book>()
  return {
    async list({ limit, offset }) {
      const all = [...books.values()]
      return { items: all.slice(offset, offset + limit), total: all.length }
    },
    async get(id) {
      return books.get(id)
    },
    async create(input) {
      const book: Book = { id: randomUUID(), ...input, createdAt: new Date().toISOString() }
      books.set(book.id, book)
      return book
    },
    async replace(id, input) {
      const existing = books.get(id)
      if (!existing) return undefined
      const updated: Book = { ...existing, ...input }
      books.set(id, updated)
      return updated
    },
    async remove(id) {
      return books.delete(id)
    },
  }
}
