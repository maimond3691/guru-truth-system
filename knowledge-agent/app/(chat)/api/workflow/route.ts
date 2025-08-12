import { createUIMessageStream, JsonToSseTransformStream } from 'ai';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { Session } from 'next-auth';
import { selectAgent } from '@/lib/agents/registry';
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

function buildTools(session: Session, dataStream: any, activeToolIds: string[]) {
  // Removed tool building logic since this is a workflow-focused endpoint
  const tools = {};
  return tools;
}

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
      console.log('Attempting to save messages:', newMessages.length);
      console.log('Sample message:', JSON.stringify(newMessages[0], null, 2));
      
      try {
        const dbMessages = convertUIMessagesToDBFormat(newMessages, chatId);
        console.log('Converted DB message:', JSON.stringify(dbMessages[0], null, 2));
        
        const messagesWithTimestamp = dbMessages.map(msg => ({
          ...msg,
          createdAt: new Date(),
        }));
        
        console.log('Final message for DB:', JSON.stringify(messagesWithTimestamp[0], null, 2));
        
        await saveMessages({ messages: messagesWithTimestamp });
        console.log('Successfully saved messages');
      } catch (error) {
        console.error('Error saving messages:', error);
        // Don't fail the entire request if message saving fails
        // The main functionality should still work
      }
    }

    // Select phase agent (default phase-1 for now)
    const agent = selectAgent({ 
      chatId: body.id, 
      messageCount: allMessages.length, 
      hintPhaseId: body.hintPhaseId 
    });

    const stream = createUIMessageStream<ChatMessage>({
      async execute() {
        try {
          // Intentionally no model generation here. The workflow UI components
          // (forms and summaries) drive the interaction for this endpoint.
          // Tools are constructed for potential future, explicit tool calls,
          // but we do not emit plain assistant text from the model.
          return;
        } catch {
          // Swallow errors; do not append any assistant message.
        }
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
  } catch (error) {
    console.error('Workflow API error:', error);
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