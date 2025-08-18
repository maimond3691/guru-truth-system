import { createUIMessageStream, JsonToSseTransformStream } from 'ai';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';
import { processPhase2FromMarkdown } from '../../phase2/service';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:chat').toResponse();

    const body = (await request.json()) as {
      chatId: string;
      fileUrl: string;
      fileName: string;
    };

    if (!body?.chatId || !body?.fileUrl) {
      return new ChatSDKError('bad_request:api', 'chatId and fileUrl required').toResponse();
    }

    const { chatId, fileUrl, fileName } = body;

    const stream = createUIMessageStream<ChatMessage>({
      async execute({ writer }) {
        try {
          // Fetch the markdown content from the file URL
          const fileResp = await fetch(fileUrl);
          if (!fileResp.ok) {
            throw new Error(`Failed to fetch file: ${fileResp.status} ${fileResp.statusText}`);
          }

          const rawContextMarkdown = await fileResp.text();
          
          if (!rawContextMarkdown.trim()) {
            const errorMsg: ChatMessage = {
              id: generateUUID(),
              role: 'assistant',
              parts: [{ type: 'text', text: 'The uploaded file appears to be empty. Please check the file and try again.' }],
              metadata: { createdAt: new Date().toISOString() },
            };
            writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
            return;
          }

          // Process with Phase 2 service
          const result = await processPhase2FromMarkdown({
            request,
            chatId,
            sessionUserId: session.user.id,
            markdown: rawContextMarkdown,
            writer,
          });
          
          if (!result) {
            const errorMsg: ChatMessage = {
              id: generateUUID(),
              role: 'assistant',
              parts: [{ type: 'text', text: 'Sorry, there was an error processing your markdown file. Please try again.' }],
              metadata: { createdAt: new Date().toISOString() },
            };
            writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
          }
        } catch (error) {
          console.error('Phase 2 workflow processing failed:', error);
          
          const errorMsg: ChatMessage = {
            id: generateUUID(),
            role: 'assistant',
            parts: [{ 
              type: 'text', 
              text: `Sorry, there was an error processing your markdown file "${fileName}". Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
            metadata: { createdAt: new Date().toISOString() },
          };
          writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
        }
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
  } catch (error) {
    console.error('Phase 2 workflow API error:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}
