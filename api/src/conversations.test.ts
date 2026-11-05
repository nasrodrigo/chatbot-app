import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { startTestServer, type TestServer } from './testing/server.js'

interface Conversation {
  id: string
  title: string
}

describe('conversations API', () => {
  let server: TestServer

  before(async () => {
    server = await startTestServer()
  })

  after(async () => {
    await server.close()
  })

  it('creates, lists, and deletes a conversation', async () => {
    const createRes = await fetch(`${server.baseUrl}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Recipe help' }),
    })
    assert.equal(createRes.status, 201)
    const conversation = (await createRes.json()) as Conversation
    assert.equal(conversation.title, 'Recipe help')

    const listRes = await fetch(`${server.baseUrl}/api/v1/conversations`)
    assert.equal(listRes.status, 200)
    const list = (await listRes.json()) as { items: Conversation[]; total: number }
    assert.equal(list.total, 1)
    assert.ok(list.items[0])
    assert.equal(list.items[0].id, conversation.id)

    const deleteRes = await fetch(`${server.baseUrl}/api/v1/conversations/${conversation.id}`, {
      method: 'DELETE',
    })
    assert.equal(deleteRes.status, 204)
  })

  it('adds a user and assistant message', async () => {
    const createRes = await fetch(`${server.baseUrl}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const conversation = (await createRes.json()) as Conversation

    const messageRes = await fetch(
      `${server.baseUrl}/api/v1/conversations/${conversation.id}/messages`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Hello' }),
      },
    )
    assert.equal(messageRes.status, 201)
    const body = (await messageRes.json()) as {
      userMessage: { role: string; content: string }
      assistantMessage: { role: string }
    }
    assert.equal(body.userMessage.role, 'user')
    assert.equal(body.userMessage.content, 'Hello')
    assert.equal(body.assistantMessage.role, 'assistant')
  })

  it('rejects empty messages', async () => {
    const createRes = await fetch(`${server.baseUrl}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const conversation = (await createRes.json()) as Conversation
    const messageRes = await fetch(
      `${server.baseUrl}/api/v1/conversations/${conversation.id}/messages`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '   ' }),
      },
    )
    assert.equal(messageRes.status, 400)
  })

  it('returns not found for unknown conversations', async () => {
    const res = await fetch(
      `${server.baseUrl}/api/v1/conversations/00000000-0000-4000-8000-000000000000/messages`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Hello' }),
      },
    )
    assert.equal(res.status, 404)
  })
})
