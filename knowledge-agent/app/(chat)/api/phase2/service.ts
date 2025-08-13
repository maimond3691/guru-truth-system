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
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rawContext: markdown }),
  });

  if (!resp.ok) return false;

  const data = await resp.json();
  const parsed = Phase2ResponseSchema.safeParse(data);
  if (!parsed.success) return false;

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
  } catch {}

  return true;
} 