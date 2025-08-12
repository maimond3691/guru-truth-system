import { type ClassValue, clsx } from 'clsx';
import { formatISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { type UIMessage, type CoreAssistantMessage, type CoreToolMessage, type UIMessagePart } from 'ai';

import type { 
  ChatMessage, 
  CustomUIDataTypes, 
  ChatTools, 
} from './types';
import type { Document, DBMessage } from './db/schema';
import { ChatSDKError } from './errors';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new ChatSDKError('unauthorized:api');
    }

    throw new ChatSDKError('bad_request:api');
  }

  return await response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const response = await fetch(input, init);

  if (!response.ok) {
    if (response.status === 401) {
      throw new ChatSDKError('unauthorized:api');
    }

    if (response.status === 403) {
      throw new ChatSDKError('forbidden:api');
    }

    if (response.status === 404) {
      throw new ChatSDKError('not_found:api');
    }

    throw new ChatSDKError('bad_request:api');
  }

  return response;
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }
  return null;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (documents.length === 0) return new Date();
  if (index >= documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ChatMessage>;
}): string | null {
  const lastUserMessageIndex = messages.findLastIndex(
    (message) => message.role === 'user',
  );

  return lastUserMessageIndex !== -1
    ? messages[lastUserMessageIndex].id
    : null;
}

export function sanitizeText(text: string) {
  return text.replace(/\0/g, '');
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

export function convertUIMessagesToDBFormat(
  messages: ChatMessage[],
  chatId: string,
): Omit<DBMessage, 'createdAt'>[] {
  return messages.map((message) => ({
    id: message.id,
    chatId,
    role: message.role,
    parts: Array.isArray(message.parts) ? message.parts : [],
    attachments: [],
  }));
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
