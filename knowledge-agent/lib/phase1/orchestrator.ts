import { generateText } from 'ai';
import type { Phase1Params, EvidenceItem } from './types';
import { fetchGithubEvidence } from './fetch-github';
import { renderRawContextMarkdown } from './render';
import { myProvider } from '../ai/providers';

function summarizeLabels(items: EvidenceItem[]): string {
  const labels = new Set<string>();
  for (const it of items) {
    labels.add(it.sourceName);
    const pathParts = it.identifier.split('/');
    if (pathParts.length) labels.add(pathParts[0]);
  }
  return Array.from(labels).slice(0, 200).join(', ');
}

function buildDependencySummary(evidence: EvidenceItem[]): string {
  // Aggregate from evidence metadata.packageJsonSummary if present
  type DepMap = Record<string, Set<string>>;
  const deps: DepMap = {};
  const devDeps: DepMap = {};
  let projectCount = 0;

  for (const ev of evidence) {
    const pjs = (ev.metadata && (ev.metadata as any).packageJsonSummary) as
      | {
          name?: string;
          version?: string;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        }
      | undefined;
    if (!pjs) continue;
    projectCount += 1;
    const addTo = (src: Record<string, string> | undefined, target: DepMap) => {
      if (!src) return;
      for (const [name, ver] of Object.entries(src)) {
        if (!target[name]) target[name] = new Set<string>();
        target[name].add(ver);
      }
    };
    addTo(pjs.dependencies, deps);
    addTo(pjs.devDependencies, devDeps);
  }

  const format = (m: DepMap, title: string) => {
    const entries = Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, vers]) => `- ${name}: ${Array.from(vers).join(' | ')}`);
    if (entries.length === 0) return `${title}: None`;
    return `${title} (unique ${entries.length}):\n${entries.join('\n')}`;
  };

  const lines: string[] = [];
  lines.push(`Projects with package.json detected: ${projectCount}`);
  lines.push('');
  lines.push(format(deps, 'Runtime dependencies'));
  lines.push('');
  lines.push(format(devDeps, 'Dev dependencies'));
  return lines.join('\n');
}

export async function runPhase1(params: Phase1Params) {
  // 1) gather evidence (github v1)
  const github = params.sources[0] as any; // Support both old and new structure
  const evidence = await fetchGithubEvidence(github);

  // Build dependency summary if any package.json summaries exist
  const dependencySummary = buildDependencySummary(evidence);

  // 2) summarize themes/workflows using small prompt on metadata only
  const labelText = summarizeLabels(evidence);

  const { text: themesText } = await generateText({
    model: myProvider.languageModel('title-model'),
    system:
      'Extract 3-5 concise themes from the provided labels. Return a comma-separated list without extra prose.',
    prompt: labelText || 'general',
  });

  const { text: workflowsText } = await generateText({
    model: myProvider.languageModel('title-model'),
    system:
      'Infer 2-5 likely workflows affected (short nouns or verb phrases) from the provided labels. Comma-separated.',
    prompt: labelText || 'general',
  });

  const themes = themesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const workflows = workflowsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // 3) render markdown (frontmatter placeholder to be filled by caller)
  const content = renderRawContextMarkdown({
    generatedAtIso: new Date().toISOString(),
    params,
    evidence,
    themes,
    workflows,
    dependencySummary,
  });

  // 4) propose filename
  const contextModes = github.contextOptions ? github.contextOptions.map((opt: any) => opt.mode) : ['date-range'];
  const modeString = contextModes.join('-');
  const dateString = github.contextOptions?.find((opt: any) => opt.mode === 'date-range')?.sinceDate?.replaceAll('-', '') || 'NOW';
  const titleSuffix = 'Github';
  const fileName = `raw-context-${titleSuffix}-${modeString}-${dateString}.md`;
  const filePath = `docs/raw-context/github/${fileName}`;

  return { content, evidenceCount: evidence.length, fileName, filePath, themes, workflows };
} 