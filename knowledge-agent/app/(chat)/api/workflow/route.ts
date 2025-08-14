import { createUIMessageStream, JsonToSseTransformStream } from 'ai';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';

import {
  saveChat,
  saveMessages,
  getChatById,
  getMessagesByChatId,
} from '@/lib/db/queries';
import { 
  convertUIMessagesToDBFormat, 
  getMostRecentUserMessage,
  getTextFromMessage,
  generateUUID 
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';
import { processPhase2FromMarkdown } from '../phase2/service';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:chat').toResponse();

    const body = (await request.json()) as {
      id: string; // chatId
      message: ChatMessage; // last user message
      messages?: ChatMessage[];
      hintPhaseId?: 'phase-1' | 'phase-2' | 'phase-3';
    };

    if (!body?.id || !body?.message) return new ChatSDKError('bad_request:api').toResponse();

    const chatId = body.id;
    const allMessages = body.messages || [];
    const userMessage = body.message;

    // Check if this is a new chat that needs to be created
    let chatExists = false;
    try {
      await getChatById({ id: chatId });
      chatExists = true;
    } catch {
      chatExists = false;
    }

    // If chat doesn't exist, create it with a generated title
    if (!chatExists) {
      const firstUserMessage = getMostRecentUserMessage([userMessage]);
      let title = 'New Chat';
      
      if (firstUserMessage) {
        try {
          title = await generateTitleFromUserMessage({ message: firstUserMessage });
        } catch (error) {
          // Fallback to extracting text from the message
          const messageText = getTextFromMessage(userMessage);
          title = messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
        }
      }

      await saveChat({
        id: chatId,
        userId: session.user.id,
        title: title || 'New Chat',
      });
    }

    // Get existing messages from database
    let existingMessages: ChatMessage[] = [];
    try {
      const dbMessages = await getMessagesByChatId({ id: chatId });
      existingMessages = dbMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        parts: msg.parts as any,
        metadata: {
          createdAt: msg.createdAt.toISOString(),
        },
      }));
    } catch {
      existingMessages = [];
    }

    // Determine which messages are new and need to be saved
    const existingMessageIds = new Set(existingMessages.map(m => m.id));
    const newMessages = allMessages.filter(msg => !existingMessageIds.has(msg.id));

    // Save new messages to database
    if (newMessages.length > 0) {
      try {
        const dbMessages = convertUIMessagesToDBFormat(newMessages, chatId);
        const messagesWithTimestamp = dbMessages.map(msg => ({
          ...msg,
          createdAt: new Date(),
        }));
        await saveMessages({ messages: messagesWithTimestamp });
      } catch (error) {
        // Continue even if message persistence fails
      }
    }

    const stream = createUIMessageStream<ChatMessage>({
      async execute({ writer }) {
        try {
          // Show progress message immediately
          const progressMsg: ChatMessage = {
            id: generateUUID(),
            role: 'assistant',
            parts: [{ type: 'text', text: 'Generating Initial Guru Docs…' }],
            metadata: { createdAt: new Date().toISOString() },
          };
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(progressMsg), transient: true });
          try {
            const dbMsgs = convertUIMessagesToDBFormat([progressMsg], chatId).map(m => ({ ...m, createdAt: new Date() }));
            await saveMessages({ messages: dbMsgs });
          } catch {}

          // Phase 2: detect markdown attachment and delegate to the phase service
          const fileParts = (userMessage?.parts || []).filter((p: any) => (p as any).type === 'file') as any[];
          const mdPart = fileParts.find((p: any) => {
            const name = (p.name || '').toLowerCase();
            const media = (p.mediaType || '').toLowerCase();
            
            // Check for various markdown file patterns
            const nameContainsMd = name.includes('.md') || name.endsWith('.md') || name.endsWith('.markdown');
            const mediaIsText = media.includes('markdown') || media === 'text/plain' || media === 'application/octet-stream';
            
            // Accept if name contains .md and media type is text-like
            return nameContainsMd && mediaIsText;
          });

          if (mdPart) {
            try {
              const resp = await fetch((mdPart as any).url);
              const rawContextMarkdown = await resp.text();
              
              if (rawContextMarkdown.trim()) {
                const result = await processPhase2FromMarkdown({
                  request,
                  chatId,
                  sessionUserId: session.user.id,
                  markdown: rawContextMarkdown,
                  writer,
                });
                
                if (!result) {
                  // If processPhase2FromMarkdown returns false, append an error message
                  const errorMsg: ChatMessage = {
                    id: generateUUID(),
                    role: 'assistant',
                    parts: [{ type: 'text', text: 'Sorry, there was an error processing your markdown file. Please try again.' }],
                    metadata: { createdAt: new Date().toISOString() },
                  };
                  writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
                }
              }
            } catch (e) {
              console.error('Phase 2 processing failed:', e);
              
              // Append an error message to the stream
              const errorMsg: ChatMessage = {
                id: generateUUID(),
                role: 'assistant',
                parts: [{ type: 'text', text: 'Sorry, there was an error processing your markdown file. Please try again.' }],
                metadata: { createdAt: new Date().toISOString() },
              };
              writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
            }
          }

          return;
        } catch {
          // Swallow errors; do not append any assistant message.
        }
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

// PATCH endpoint for saving messages without triggering workflow
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:chat').toResponse();

    const body = (await request.json()) as {
      id: string; // chatId
      messages: ChatMessage[];
    };

    if (!body?.id || !body?.messages) return new ChatSDKError('bad_request:api').toResponse();

    const chatId = body.id;
    const allMessages = body.messages;

    // Verify chat ownership
    try {
      const chat = await getChatById({ id: chatId });
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    } catch {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    // Get existing messages from database
    let existingMessages: ChatMessage[] = [];
    try {
      const dbMessages = await getMessagesByChatId({ id: chatId });
      existingMessages = dbMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        parts: msg.parts as any,
        metadata: {
          createdAt: msg.createdAt.toISOString(),
        },
      }));
    } catch {
      existingMessages = [];
    }

    // Determine which messages are new and need to be saved
    const existingMessageIds = new Set(existingMessages.map(m => m.id));
    const newMessages = allMessages.filter(msg => !existingMessageIds.has(msg.id));

    // Save new messages to database
    if (newMessages.length > 0) {
      console.log('PATCH: Attempting to save messages:', newMessages.length);
      
      try {
        const dbMessages = convertUIMessagesToDBFormat(newMessages, chatId);
        const messagesWithTimestamp = dbMessages.map(msg => ({
          ...msg,
          createdAt: new Date(),
        }));
        
        await saveMessages({ messages: messagesWithTimestamp });
        console.log('PATCH: Successfully saved messages');
      } catch (error) {
        console.error('PATCH: Error saving messages:', error);
        return new ChatSDKError('bad_request:database').toResponse();
      }
    }

    return new Response(JSON.stringify({ success: true, saved: newMessages.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Save messages API error:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 