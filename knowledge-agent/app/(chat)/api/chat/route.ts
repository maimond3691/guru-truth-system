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

    // Check if this message contains a markdown file for Phase 2 processing
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

    // If markdown file detected, redirect to Phase 2 processing
    if (mdPart) {
      const stream = createUIMessageStream<ChatMessage>({
        async execute({ writer }) {
          try {
            // Show Phase 2 progress message
            const progressMsg: ChatMessage = {
              id: generateUUID(),
              role: 'assistant',
              parts: [{ type: 'text', text: 'Generating Initial Guru Docs…' }],
              metadata: { createdAt: new Date().toISOString() },
            };
            writer.write({ type: 'data-appendMessage', data: JSON.stringify(progressMsg), transient: true });

            // Forward to Phase 2 processing
            const resp = await fetch(new URL('/api/workflow/phase2', request.url), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || '',
              },
              body: JSON.stringify({
                chatId,
                fileUrl: mdPart.url,
                fileName: mdPart.name,
              }),
            });

            if (!resp.ok) {
              const errorMsg: ChatMessage = {
                id: generateUUID(),
                role: 'assistant',
                parts: [{ type: 'text', text: 'Sorry, there was an error processing your markdown file. Please try again.' }],
                metadata: { createdAt: new Date().toISOString() },
              };
              writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
              return;
            }

            // Stream the Phase 2 response
            if (resp.body) {
              const reader = resp.body.getReader();
              const decoder = new TextDecoder();

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = decoder.decode(value);
                  const lines = chunk.split('\n');

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        writer.write({ type: 'data-appendMessage', data: JSON.stringify(data), transient: true });
                      } catch (e) {
                        // Skip malformed lines
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Error reading Phase 2 stream:', error);
              }
            }
          } catch (error) {
            console.error('Error in Phase 2 forwarding:', error);
            const errorMsg: ChatMessage = {
              id: generateUUID(),
              role: 'assistant',
              parts: [{ type: 'text', text: 'Sorry, there was an error processing your request.' }],
              metadata: { createdAt: new Date().toISOString() },
            };
            writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
          }
        },
      });

      return new Response(stream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
    }

    // For regular chat messages (no markdown files), return empty stream
    // This allows the frontend to handle message display without backend processing
    const stream = createUIMessageStream<ChatMessage>({
      execute: () => {
        // No processing needed for regular messages
        // The frontend already has the message from the request
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
  } catch (error) {
    console.error('Chat API error:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

// PATCH endpoint for saving messages without triggering processing
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
