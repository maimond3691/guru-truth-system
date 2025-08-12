import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';

export interface HandleWorkflowTurnArgs {
  chatId: string;
  session: Session;
  userMessage: ChatMessage; // last user message
  messagesSoFar: ChatMessage[];
}

export interface HandleWorkflowTurnResult {
  assistantMessages: ChatMessage[];
}

// Very simple heuristic classifier; replace with LLM-backed intent resolver later
function classifyIntent(userText: string):
  | { intent: 'select_source'; source: 'github' | 'docs' | 'sheets' | 'guru' | 'other' }
  | { intent: 'freeform' } {
  const t = userText.toLowerCase();
  if (t.includes('github')) return { intent: 'select_source', source: 'github' };
  if (t.includes('google docs') || t.includes('docs')) return { intent: 'select_source', source: 'docs' };
  if (t.includes('google sheets') || t.includes('sheets')) return { intent: 'select_source', source: 'sheets' };
  if (t.includes('guru')) return { intent: 'select_source', source: 'guru' };
  if (t.includes('other')) return { intent: 'select_source', source: 'other' };
  return { intent: 'freeform' };
}

export async function handleWorkflowTurn({
  chatId,
  session,
  userMessage,
  messagesSoFar,
}: HandleWorkflowTurnArgs): Promise<HandleWorkflowTurnResult> {
  const lastText = (userMessage.parts ?? [])
    .filter((p) => p.type === 'text')
    // @ts-ignore
    .map((p) => p.text as string)
    .join(' ');

  const intent = classifyIntent(lastText);

  let assistantText = '';
  if (intent.intent === 'select_source') {
    if (intent.source === 'github') {
      assistantText = 'I can help collect raw context from GitHub. Opening setup panel…';
    } else if (intent.source === 'docs' || intent.source === 'sheets') {
      assistantText = 'I can help collect raw context from Google. Opening setup panel…';
    } else if (intent.source === 'guru') {
      assistantText = 'Guru setup is not implemented yet. I will guide you once available.';
    } else {
      assistantText = 'Custom source flow is not implemented yet. Please describe what to ingest.';
    }
  } else {
    assistantText = 'Noted. For Phase 1, choose a data source (GitHub or Google) to begin.';
  }

  const assistantMessage: ChatMessage = {
    id: generateUUID(),
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: assistantText,
      } as any,
    ],
    metadata: { createdAt: new Date().toISOString() } as any,
  };

  return { assistantMessages: [assistantMessage] };
} 