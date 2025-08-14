import type { ChatMessage } from '@/lib/types';
import { Phase2ResponseSchema } from './schema';
import { generateUUID } from '@/lib/utils';
import { saveDocument, saveMessages } from '@/lib/db/queries';

export async function processPhase2FromMarkdown(opts: {
  request: Request;
  chatId: string;
  sessionUserId: string;
  markdown: string;
  writer: { write: (part: any) => void };
}) {
  const { request, chatId, sessionUserId, markdown, writer } = opts;

  const apiUrl = new URL('/api/phase2', (request as any).url);
  
  // Forward cookies for authentication
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  // Check if document is large enough to benefit from streaming
  const estimatedTokens = Math.ceil(markdown.length / 4); // ~4 chars per token
  const shouldStream = estimatedTokens > 150000;

  if (shouldStream) {
    // Use streaming for large documents
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rawContext: markdown, stream: true }),
    });

    if (!resp.ok) {
      console.error('Phase 2 streaming API call failed:', resp.status, resp.statusText);
      return false;
    }

    if (!resp.body) {
      console.error('No response body for streaming');
      return false;
    }

    // Send initial progress message
    const progressMsg: ChatMessage = {
      id: generateUUID(),
      role: 'assistant',
      parts: [{ 
        type: 'text', 
        text: `🔄 **Large Document Detected** (${estimatedTokens.toLocaleString()} tokens)\n\nInitiating advanced chunking strategy for optimal processing...` 
      }],
      metadata: { createdAt: new Date().toISOString() },
    };
    writer.write({ type: 'data-appendMessage', data: JSON.stringify(progressMsg), transient: true });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let finalResult: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              // Send progress updates as messages
              if (event.type === 'progress') {
                const statusMsg: ChatMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  parts: [{ 
                    type: 'text', 
                    text: `PROCESSING chunk ${event.currentChunk}/${event.totalChunks}: ${event.message}${event.cardsInChunk ? ` (+${event.cardsInChunk} cards)` : ''}` 
                  }],
                  metadata: { createdAt: new Date().toISOString() },
                };
                writer.write({ type: 'data-appendMessage', data: JSON.stringify(statusMsg), transient: true });
              } else if (event.type === 'complete') {
                finalResult = event.data;
                const completionMsg: ChatMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  parts: [{ 
                    type: 'text', 
                    text: `PROCESSING COMPLETE: ${event.message}` 
                  }],
                  metadata: { createdAt: new Date().toISOString() },
                };
                writer.write({ type: 'data-appendMessage', data: JSON.stringify(completionMsg), transient: true });
                break;
              } else if (event.type === 'error') {
                const errorMsg: ChatMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  parts: [{ 
                    type: 'text', 
                    text: `ERROR: ${event.message}` 
                  }],
                  metadata: { createdAt: new Date().toISOString() },
                };
                writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
                return false;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading streaming response:', error);
      return false;
    }

    if (!finalResult) {
      console.error('No final result received from streaming');
      return false;
    }

    const parsed = Phase2ResponseSchema.safeParse(finalResult);
    if (!parsed.success) {
      console.error('Phase 2 schema validation failed:', parsed.error);
      return false;
    }

    // Continue with document creation using the final result
    const processedData = parsed.data;
    const title = 'Phase 2 — Initial Guru Docs (Chunked Processing)';
    const mdLines: string[] = [];
    mdLines.push(`# ${title}`);
    mdLines.push('');
    mdLines.push(`Generated ${processedData.card_count} cards using advanced chunking strategy.`);
    mdLines.push('');
    processedData.cards.forEach((card, i) => {
      mdLines.push(`## ${i + 1}. ${card.title}`);
      mdLines.push('');
      mdLines.push(`- Audience: ${card.audience}`);
      mdLines.push(`- Pain: ${card.pain}`);
      mdLines.push('');
      mdLines.push(card.content_markdown);
      mdLines.push('');
      mdLines.push('---');
      mdLines.push('');
    });
    const content = mdLines.join('\n');

    const docId = generateUUID();
    await saveDocument({ id: docId, title, kind: 'text', content, userId: sessionUserId });

    const assistantMsg: ChatMessage = {
      id: generateUUID(),
      role: 'assistant',
      parts: [
        { type: 'text', text: `Enter Canvas Mode to Review & Refine Guru Documentation\n\n[[PROCEED_CANVAS|{"id":"${docId}","title":"${title}"}]]` },
      ],
      metadata: { createdAt: new Date().toISOString() },
    };
    
    writer.write({ type: 'data-appendMessage', data: JSON.stringify(assistantMsg), transient: true });

    try {
      const { convertUIMessagesToDBFormat } = await import('@/lib/utils');
      const dbMsgs = convertUIMessagesToDBFormat([assistantMsg], chatId).map(m => ({
        ...m,
        createdAt: new Date(),
      }));
      await saveMessages({ messages: dbMsgs });
    } catch (error) {
      console.error('Failed to save assistant message:', error);
    }

    return true;
  } else {
    // Use regular processing for smaller documents
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rawContext: markdown }),
    });

    if (!resp.ok) {
      console.error('Phase 2 API call failed:', resp.status, resp.statusText);
      return false;
    }

    const data = await resp.json();
    const parsed = Phase2ResponseSchema.safeParse(data);
    
    if (!parsed.success) {
      console.error('Phase 2 schema validation failed:', parsed.error);
      return false;
    }

    const title = 'Phase 2 — Initial Guru Docs';
    const mdLines: string[] = [];
    mdLines.push(`# ${title}`);
    mdLines.push('');
    mdLines.push(`Generated ${parsed.data.card_count} cards.`);
    mdLines.push('');
    parsed.data.cards.forEach((card, i) => {
      mdLines.push(`## ${i + 1}. ${card.title}`);
      mdLines.push('');
      mdLines.push(`- Audience: ${card.audience}`);
      mdLines.push(`- Pain: ${card.pain}`);
      mdLines.push('');
      mdLines.push(card.content_markdown);
      mdLines.push('');
      mdLines.push('---');
      mdLines.push('');
    });
    const content = mdLines.join('\n');

    const docId = generateUUID();
    await saveDocument({ id: docId, title, kind: 'text', content, userId: sessionUserId });

    const assistantMsg: ChatMessage = {
      id: generateUUID(),
      role: 'assistant',
      parts: [
        { type: 'text', text: `Enter Canvas Mode to Review & Refine Guru Documentation\n\n[[PROCEED_CANVAS|{"id":"${docId}","title":"${title}"}]]` },
      ],
      metadata: { createdAt: new Date().toISOString() },
    };
    
    writer.write({ type: 'data-appendMessage', data: JSON.stringify(assistantMsg), transient: true });

    try {
      const { convertUIMessagesToDBFormat } = await import('@/lib/utils');
      const dbMsgs = convertUIMessagesToDBFormat([assistantMsg], chatId).map(m => ({
        ...m,
        createdAt: new Date(),
      }));
      await saveMessages({ messages: dbMsgs });
    } catch (error) {
      console.error('Failed to save assistant message:', error);
    }

    return true;
  }
} 