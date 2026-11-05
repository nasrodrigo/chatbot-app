import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { startTestServer, type TestServer } from './testing/server.js'

interface ErrorBody {
  error: { code: string; message: string; requestId?: string }
}

describe('app', () => {
  let server: TestServer

  before(async () => {
    server = await startTestServer()
  })
  after(async () => {
    await server.close()
  })

  it('GET /health returns ok and a request id', async () => {
    const res = await fetch(`${server.baseUrl}/health`)
    assert.equal(res.status, 200)
    assert.ok(res.headers.get('x-request-id'))
    const body = (await res.json()) as { status: string }
    assert.equal(body.status, 'ok')
  })

  it('echoes a safe incoming request id', async () => {
    const res = await fetch(`${server.baseUrl}/health`, { headers: { 'x-request-id': 'abc-123' } })
    assert.equal(res.headers.get('x-request-id'), 'abc-123')
  })

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await fetch(`${server.baseUrl}/nope`)
    assert.equal(res.status, 404)
    const body = (await res.json()) as ErrorBody
    assert.equal(body.error.code, 'not_found')
  })

  it('returns 400 for malformed JSON', async () => {
    const res = await fetch(`${server.baseUrl}/api/v1/anything`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    })
    assert.equal(res.status, 400)
    const body = (await res.json()) as ErrorBody
    assert.equal(body.error.code, 'bad_request')
  })

  it('sets security headers', async () => {
    const res = await fetch(`${server.baseUrl}/health`)
    assert.equal(res.headers.get('x-powered-by'), null)
    assert.ok(res.headers.get('x-content-type-options'))
  })
})
