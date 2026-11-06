import { randomUUID } from 'node:crypto'
import { chat } from './chatbot.js'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Array<{ data: Blob; type: string }>
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface CreateMessageInput {
  text: string
  attachments?: { data: Blob; type: string }[]
}

export interface ConversationStore {
  list(options: { limit: number; offset: number }): Promise<{ items: Conversation[]; total: number }>
  get(id: string): Promise<Conversation | undefined>
  create(title?: string): Promise<Conversation>
  remove(id: string): Promise<boolean>
  addMessage(id: string, input: CreateMessageInput): Promise<Conversation | undefined>
}

export function createInMemoryConversationStore(): ConversationStore {
  const conversations = new Map<string, Conversation>()

  return {
    async list({ limit, offset }) {
      const all = [...conversations.values()]
      return { items: all.slice(offset, offset + limit), total: all.length }
    },

    async get(id) {
      return conversations.get(id)
    },

    async create(title) {
      const now = new Date().toISOString();
      const conversation: Conversation = {
        id: randomUUID(),
        title: title?.trim() || 'New conversation',
        messages: [],
        createdAt: now,
        updatedAt: now,
      }
      conversations.set(conversation.id, conversation)
      return conversation
    },

    async remove(id) {
      return conversations.delete(id)
    },

    async addMessage(id, input) {
      const conversation = conversations.get(id)
      if (!conversation) {
        return undefined
      }

      const inputContent = JSON.parse(JSON.stringify(input))

      const now = new Date().toISOString()
      const userMessage: ChatMessage = {
        id: randomUUID(),
        role: 'user',
        content: inputContent.text,
        attachments: inputContent.attachments?.map((a: any) => ({ data: a.data, type: a.type, mimeType: a.mimeType, source_type: a.source_type })),
        createdAt: now,
      }
      const assistantContent = await chat({
        text: inputContent.text,
        attachments: inputContent.attachments?.map((a: any) => ({ data: a.data, type: a.type, mimeType: a.mimeType, source_type: a.source_type })),
      })
      const assistantMessage: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: assistantContent as string,
        createdAt: now,
      }
      conversation.messages.push(userMessage, assistantMessage)
      conversation.updatedAt = now
      return conversation
    },
  }
}
