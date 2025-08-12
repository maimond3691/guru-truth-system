import { tool } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import {
  computePhase1RequiredInputs,
  getOrCreateWorkflowRun,
  getWorkflowRun,
  updateWorkflowRun,
} from '@/lib/db/queries';

export function getWorkflowTools({ session }: { session: Session }) {
  const getWorkflowState = tool({
    description: 'Get the current workflow state for this chat and phase.',
    inputSchema: z.object({ chatId: z.string(), phaseId: z.enum(['phase-1', 'phase-2', 'phase-3']) }),
    execute: async ({ chatId, phaseId }) => {
      const run = await getOrCreateWorkflowRun({ chatId, phaseId });
      return {
        id: run.id,
        chatId: run.chatId,
        phaseId: run.phaseId,
        status: run.status,
        step: run.step,
        params: run.params ?? {},
        requiredInputs: run.requiredInputs ?? [],
        artifacts: run.artifacts ?? [],
        approvals: run.approvals ?? {},
      };
    },
  });

  const setWorkflowParams = tool({
    description: 'Set or update workflow parameters (merges and validates).',
    inputSchema: z.object({ chatId: z.string(), phaseId: z.enum(['phase-1', 'phase-2', 'phase-3']), params: z.any() }),
    execute: async ({ chatId, phaseId, params }) => {
      const run = await getOrCreateWorkflowRun({ chatId, phaseId });
      const mergedParams = { ...(run.params ?? {}), ...(params ?? {}) };
      const requiredInputs = phaseId === 'phase-1' ? computePhase1RequiredInputs(mergedParams) : [];
      const updated = await updateWorkflowRun(run.id, { params: mergedParams, requiredInputs });
      return { id: updated.id, params: updated.params, requiredInputs: updated.requiredInputs };
    },
  });

  const listAvailableActions = tool({
    description: 'List available next actions for the current workflow state.',
    inputSchema: z.object({ chatId: z.string(), phaseId: z.enum(['phase-1', 'phase-2', 'phase-3']) }),
    execute: async ({ chatId, phaseId }) => {
      const run = (await getWorkflowRun({ chatId, phaseId })) ?? (await getOrCreateWorkflowRun({ chatId, phaseId }));
      const actions: string[] = [];
      if (phaseId === 'phase-1') {
        const req = Array.isArray(run.requiredInputs) ? run.requiredInputs : [];
        switch (run.step) {
          case 'collect_params':
            actions.push('set_params');
            if (req.length === 0) actions.push('confirm_params');
            break;
          case 'validate':
            actions.push('start_ingest');
            break;
          case 'ingest':
            actions.push('finish_ingest', 'summarize');
            break;
          case 'summarize':
            actions.push('request_approval');
            break;
          case 'awaiting_approval':
            actions.push('approve', 'reject');
            break;
        }
      }
      return { actions };
    },
  });

  const advanceWorkflow = tool({
    description: 'Advance the workflow by applying an allowed event. Enforces minimal FSM.',
    inputSchema: z.object({
      chatId: z.string(),
      phaseId: z.enum(['phase-1', 'phase-2', 'phase-3']),
      event: z.enum([
        'confirm_params',
        'start_ingest',
        'finish_ingest',
        'summarize',
        'request_approval',
        'approve',
        'reject',
      ]),
      payload: z.any().optional(),
    }),
    execute: async ({ chatId, phaseId, event, payload }) => {
      const run = (await getWorkflowRun({ chatId, phaseId })) ?? (await getOrCreateWorkflowRun({ chatId, phaseId }));
      if (phaseId !== 'phase-1') {
        return { error: 'Not implemented for this phase' };
      }
      const req = Array.isArray(run.requiredInputs) ? run.requiredInputs : [];
      let step = run.step as any;
      let status = run.status as any;
      const artifacts = Array.isArray(run.artifacts) ? run.artifacts : [];

      switch (event) {
        case 'confirm_params':
          if (step !== 'collect_params' || req.length > 0) return { error: 'params incomplete' };
          step = 'validate';
          break;
        case 'start_ingest':
          if (step !== 'validate') return { error: 'invalid transition' };
          step = 'ingest';
          break;
        case 'finish_ingest':
          if (step !== 'ingest') return { error: 'invalid transition' };
          // payload may include artifacts to append
          if (payload?.artifacts && Array.isArray(payload.artifacts)) {
            artifacts.push(...payload.artifacts);
          }
          step = 'summarize';
          break;
        case 'summarize':
          if (step !== 'ingest' && step !== 'summarize') return { error: 'invalid transition' };
          step = 'summarize';
          break;
        case 'request_approval':
          if (step !== 'summarize') return { error: 'invalid transition' };
          step = 'awaiting_approval';
          status = 'awaiting_approval';
          break;
        case 'approve':
          if (step !== 'awaiting_approval') return { error: 'invalid transition' };
          step = 'complete';
          status = 'complete';
          break;
        case 'reject':
          if (step !== 'awaiting_approval') return { error: 'invalid transition' };
          step = 'collect_params';
          status = 'active';
          break;
      }

      const updated = await updateWorkflowRun(run.id, { step, status, artifacts });
      return { id: updated.id, status: updated.status, step: updated.step, artifacts: updated.artifacts };
    },
  });

  const integrationStatus = tool({
    description: 'Check whether external integrations are connected (e.g., Google).',
    inputSchema: z.object({ provider: z.enum(['google']) }),
    execute: async ({ provider }) => {
      if (provider === 'google') {
        try {
          // Attempt to resolve a valid token; will throw if missing
          const { getValidGoogleAccessToken } = await import('@/lib/db/queries');
          await getValidGoogleAccessToken(session.user.id);
          return { connected: true };
        } catch {
          return { connected: false };
        }
      }
      return { connected: false };
    },
  });

  return { getWorkflowState, setWorkflowParams, listAvailableActions, advanceWorkflow, integrationStatus };
} 