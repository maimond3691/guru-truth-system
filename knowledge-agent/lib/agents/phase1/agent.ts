import type { BuildPromptContext, BuildToolsContext, PhaseAgent } from '../types';
import { systemPrompt as baseSystemPrompt } from '@/lib/ai/prompts';

function phase1SystemPrompt({ selectedChatModel, requestHints }: BuildPromptContext) {
  // Build on the base system prompt, but specialize to Phase 1 goals and guardrails
  const base = baseSystemPrompt({ selectedChatModel, requestHints: requestHints as any });

  const phase1Directives = `
You are the Phase 1 agent (Raw Context Aggregator).
Your objectives:
- Guide the user to specify data sources for raw context generation; default focus is GitHub.
- Collect and validate parameters: org, repo set (all or subset), branches, sinceDate (YYYY-MM-DD).
- Execute raw context generation, then present a concise summary and a download link.
- Maintain a deterministic workflow: inputs -> validation -> run -> summarize -> await approval.

Rules:
- Only offer tools and actions relevant to Phase 1 (read-only GitHub, document creation/saving).
- Do not propose tasks from later phases (no code changes, no publishing).
- If parameters are incomplete or ambiguous, ask targeted follow-up questions.
- Keep answers concise and procedural; reflect the Phase 1 workflow.
`;

  return `${base}\n\n${phase1Directives}`.trim();
}

function phase1ActiveToolIds(_context: BuildToolsContext): string[] {
  // Whitelist Phase 1 safe, read-only tools + document ops
  return [
    'createDocument',
    'updateDocument',
    'requestSuggestions', // optionally left enabled if helpful, can be removed later
    'listRepos',
    'listFiles',
    'readFile',
    'getCommitHistory',
    // Google integrations
    'listGoogleDriveFiles',
    'readGoogleDoc',
    'readGoogleSheet',
  ];
}

export const phase1Agent: PhaseAgent = {
  id: 'phase-1',
  description: 'Phase 1 Raw Context Aggregation Agent: guides parameter collection and runs evidence aggregation.',
  buildSystemPrompt: phase1SystemPrompt,
  getActiveToolIds: phase1ActiveToolIds,
}; 