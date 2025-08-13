import type { EvidenceItem, Phase1Params } from './types';

export interface RenderArgs {
  generatedAtIso: string;
  params: Phase1Params;
  evidence: EvidenceItem[];
  themes: string[];
  workflows: string[];
  dependencySummary?: string;
}

const groupBy = <T, K extends string | number>(arr: T[], key: (t: T) => K) => {
  const result: Record<K, T[]> = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = key(item);
    if (!result[k]) {
      result[k] = [] as unknown as T[];
    }
    result[k].push(item);
  }
  return result;
};

export function renderRawContextMarkdown({
  generatedAtIso,
  params,
  evidence,
  themes,
  workflows,
  dependencySummary,
}: RenderArgs): string {
  const github = params.sources[0] as any;
  const sourcesList = [`Github (organization): ${github.org}; repos: [${github.repos.join(', ')}]; branches: [${
    github.branches.join(', ')
  }]; since: ${github.sinceDate}`];

  const totalChanges = evidence.length;

  const bySourceName = groupBy(evidence, (e) => e.sourceName);
  const byChangeType = groupBy(evidence, (e) => e.changeType);

  const lines: string[] = [];

  lines.push('---');
  lines.push('phaseState: {}');
  lines.push('---');
  lines.push('');
  lines.push('# Raw Context – Consolidated Changes');
  lines.push('');
  lines.push(`Generated: ${generatedAtIso}`);
  lines.push(`Change Period: since ${github.sinceDate}`);
  lines.push('Selected Sources:');
  for (const s of sourcesList) lines.push(`- ${s}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push(`- Total Changes Analyzed: ${totalChanges}`);
  lines.push(`- Primary Themes: ${themes.join(', ') || 'None'}`);
  lines.push(`- Affected Workflows: ${workflows.join(', ') || 'None'}`);
  lines.push('');

  if (dependencySummary && dependencySummary.trim().length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Dependency Summary');
    lines.push('');
    lines.push(dependencySummary);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Changes by Source');

  for (const [source, items] of Object.entries(bySourceName)) {
    lines.push('');
    lines.push(`### ${source} (Github)`);
    lines.push(`- Change Window: since ${github.sinceDate}`);

    const added = items.filter((i) => i.changeType === 'added').length;
    const modified = items.filter((i) => i.changeType === 'modified').length;
    const deleted = items.filter((i) => i.changeType === 'deleted').length;
    const renamed = items.filter((i) => i.changeType === 'renamed').length;

    lines.push('- Summary:');
    lines.push(`  - Added: ${added} | Modified: ${modified} | Deleted: ${deleted} | Renamed: ${renamed}`);
    lines.push('');
    lines.push('#### Evidence');
    for (const item of items) {
      lines.push(`- [${item.id}] ${item.changeType.toUpperCase()} — ${item.identifier} @ ${item.timestamp}`);
      lines.push('');
      lines.push('```diff');
      lines.push(item.snippet ?? '');
      lines.push('```');
      lines.push('');
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Changes by Type');

  const typesOrder = ['added', 'modified', 'deleted', 'renamed', 'other'] as const;
  for (const t of typesOrder) {
    const arr = byChangeType[t as keyof typeof byChangeType] ?? [];
    lines.push('');
    lines.push(`### ${t.charAt(0).toUpperCase() + t.slice(1)}`);
    for (const item of arr) {
      lines.push(`- [${item.id}] ${item.sourceName} — ${item.identifier}`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Detailed Evidence');
  for (const item of evidence) {
    lines.push('');
    lines.push(`### [${item.id}] ${item.sourceName} — ${item.changeType}`);
    lines.push(`Metadata: ${JSON.stringify(item.metadata)}`);
    lines.push(`Timestamp: ${item.timestamp}`);
    lines.push('');
    lines.push('```text');
    lines.push(item.snippet ?? '');
    lines.push('```');
  }

  lines.push('');

  return lines.join('\n');
} 