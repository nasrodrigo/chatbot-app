import { Platform } from 'react-native';
import type { ChatDraft, ChatMessage } from '../model/types';
import { File } from 'expo-file-system';

type ApiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type CreateConversationResponse = {
  id: string;
};

type SendMessageResponse = {
  conversationId: string;
  userMessage: ApiMessage;
  assistantMessage: ApiMessage;
};

export type ChatResponse = {
  conversationId: string;
  assistantMessage: ChatMessage;
};

const defaultApiUrl = Platform.OS === 'android'
  ? 'http://192.168.2.32:3000'
  : 'http://localhost:3000';

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || defaultApiUrl).replace(/\/$/, '');

const apiRequest = async <T>(path: string, init: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new Error(
      `Cannot connect to the API at ${apiUrl}. Make sure the API is running and reachable from the device.`,
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: { message?: string } };
      message = body.error?.message || message;
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

const formatDraft = async (draft: ChatDraft) => {
  const attachments = draft.attachments.map(attachment => attachment).filter(Boolean);
  const payload: {
    text?: string;
    attachments?: Array<{ data: string | FormData; type: string }>;
  } = {};

  payload.text = draft.text;
  if (attachments.length) {
    payload.attachments = await Promise.all(attachments.map( async attachment => {
      const base64 = await new File(attachment.uri).base64();
      return {
        data: base64,
        type: attachment.kind,
      };
    }));
  }

  return JSON.stringify(payload);
};

const toUiMessage = (message: ApiMessage): ChatMessage => ({
  id: message.id,
  text: message.content,
  attachments: [],
  createdAt: new Date(message.createdAt),
});

export const runChatAgent = async (
  draft: ChatDraft,
  conversationId?: string,
): Promise<ChatResponse> => {
  let activeConversationId = conversationId;

  if (!activeConversationId) {
    const conversation = await apiRequest<CreateConversationResponse>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: draft.text.slice(0, 200) || 'New conversation' }),
    });
    activeConversationId = conversation.id;
  }

  const response = await apiRequest<SendMessageResponse>(
    `/conversations/${activeConversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: await formatDraft(draft),
    },
  );

  return {
    conversationId: response.conversationId,
    assistantMessage: toUiMessage(response.assistantMessage),
  };
};