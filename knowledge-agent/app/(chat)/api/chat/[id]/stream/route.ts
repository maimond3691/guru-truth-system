import { auth } from '@/app/(auth)/auth';
import {
  getChatById,
  getMessagesByChatId,
} from '@/lib/db/queries';
import type { Chat } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import { createUIMessageStream, JsonToSseTransformStream } from 'ai';
import { differenceInSeconds } from 'date-fns';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chatId } = await params;

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  // All chats are private - check ownership
  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  // Since our workflow API doesn't generate streaming AI responses,
  // we return an empty stream or the most recent message if available
  const messages = await getMessagesByChatId({ id: chatId });
  const mostRecentMessage = messages.at(-1);

  if (!mostRecentMessage) {
    const emptyDataStream = createUIMessageStream<ChatMessage>({
      execute: () => {},
    });
    return new Response(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
  }

  if (mostRecentMessage.role !== 'assistant') {
    const emptyDataStream = createUIMessageStream<ChatMessage>({
      execute: () => {},
    });
    return new Response(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
  }

  const messageCreatedAt = new Date(mostRecentMessage.createdAt);
  const resumeRequestedAt = new Date();

  if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
    const emptyDataStream = createUIMessageStream<ChatMessage>({
      execute: () => {},
    });
    return new Response(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
  }

  // Return the most recent assistant message
  const restoredStream = createUIMessageStream<ChatMessage>({
    execute: ({ writer }) => {
      const uiMessage: ChatMessage = {
        id: mostRecentMessage.id,
        role: mostRecentMessage.role as 'assistant',
        parts: mostRecentMessage.parts as any,
        metadata: {
          createdAt: mostRecentMessage.createdAt.toISOString(),
        },
      };

      writer.write({
        type: 'data-appendMessage',
        data: JSON.stringify(uiMessage),
        transient: true,
      });
    },
  });

  return new Response(
    restoredStream.pipeThrough(new JsonToSseTransformStream()),
    { status: 200 },
  );
}
