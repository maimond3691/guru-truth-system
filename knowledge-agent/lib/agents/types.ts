export type PhaseId = 'phase-1' | 'phase-2' | 'phase-3';

export interface AgentSelectionContext {
  chatId: string;
  // Raw UI messages (already converted to UI shape) can be used for heuristic selection
  // Keeping this broad for future phases; implementations can ignore fields they don't need
  messageCount: number;
  // For future: derive from document frontmatter, cookies, or explicit UI param
  hintPhaseId?: PhaseId | null;
}

export interface RequestHintsLike {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
}

export interface BuildPromptContext {
  selectedChatModel: string;
  requestHints: RequestHintsLike;
}

export interface BuildToolsContext {
  selectedChatModel: string;
}

export interface PhaseAgent {
  id: PhaseId;
  description: string;

  // Returns the system prompt to use for this phase
  buildSystemPrompt(context: BuildPromptContext): string;

  // Returns the tool ids to enable for this phase (must match keys in the server "tools" map)
  getActiveToolIds(context: BuildToolsContext): string[];

  // Optional: validate/normalize user message or add guidance messages (not used yet)
  // preprocess?(args: { uiMessages: any[] }): any[];
} 