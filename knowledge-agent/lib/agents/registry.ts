import type { AgentSelectionContext, PhaseAgent, PhaseId } from './types';
import { phase1Agent } from './phase1/agent';

const agents: Record<PhaseId, PhaseAgent> = {
  'phase-1': phase1Agent,
  // Placeholders for future phases to be implemented
  'phase-2': phase1Agent, // temporary fallback
  'phase-3': phase1Agent, // temporary fallback
};

export function selectAgent({ hintPhaseId }: AgentSelectionContext): PhaseAgent {
  if (hintPhaseId && agents[hintPhaseId]) return agents[hintPhaseId];
  // Until phases 2/3 exist server-side, default to Phase 1
  return agents['phase-1'];
} 