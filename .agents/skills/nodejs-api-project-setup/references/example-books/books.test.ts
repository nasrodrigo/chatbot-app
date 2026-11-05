// Copy to src/routes/books.test.ts (requires the router to be mounted in src/routes/index.ts).
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { startTestServer, type TestServer } from '../testing/server.js'

interface Book {
  id: string
  title: string
  author: string
}

describe('books API', () => {
  let server: TestServer
  const url = (path = '') => `${server.baseUrl}/api/v1/books${path}`
  const json = { 'content-type': 'application/json' }

  before(async () => {
    server = await startTestServer()
  })
  after(async () => {
    await server.close()
  })

  it('creates, reads, updates and deletes a book', async () => {
    const created = await fetch(url(), {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ title: 'Dune', author: 'Frank Herbert' }),
    })
    assert.equal(created.status, 201)
    const book = (await created.json()) as Book
    assert.equal(created.headers.get('location'), `/api/v1/books/${book.id}`)

    const fetched = await fetch(url(`/${book.id}`))
    assert.equal(fetched.status, 200)

    const updated = await fetch(url(`/${book.id}`), {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ title: 'Dune Messiah', author: 'Frank Herbert' }),
    })
    assert.equal(((await updated.json()) as Book).title, 'Dune Messiah')

    const removed = await fetch(url(`/${book.id}`), { method: 'DELETE' })
    assert.equal(removed.status, 204)
    assert.equal((await fetch(url(`/${book.id}`))).status, 404)
  })

  it('lists with pagination metadata', async () => {
    const res = await fetch(url('?limit=1'))
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: Book[]; limit: number }
    assert.equal(body.limit, 1)
    assert.ok(body.items.length <= 1)
  })

  it('rejects invalid input with 400 and field details', async () => {
    const res = await fetch(url(), { method: 'POST', headers: json, body: JSON.stringify({ title: '' }) })
    assert.equal(res.status, 400)
    const body = (await res.json()) as { error: { code: string } }
    assert.equal(body.error.code, 'validation_error')
  })

  it('rejects a malformed id with 400 and an unknown id with 404', async () => {
    assert.equal((await fetch(url('/not-a-uuid'))).status, 400)
    assert.equal((await fetch(url('/3f2b1c1e-8a3e-4c57-9d3e-0a6f2f0b1a11'))).status, 404)
  })
})
