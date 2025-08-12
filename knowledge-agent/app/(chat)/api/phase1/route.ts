import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { saveDocument, getDocumentsById } from '@/lib/db/queries';
import { runPhase1 } from '@/lib/phase1/orchestrator';
import type { Phase1FrontmatterState, Phase1Params } from '@/lib/phase1/types';
import { getValidGoogleAccessToken } from '@/lib/db/queries';

async function listAllOrgRepos(org: string, token: string) {
  const repos: string[] = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const resp = await fetch(
      `https://api.github.com/orgs/${org}/repos?per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'GuruAgent/1.0.0',
        },
      },
    );
    if (!resp.ok) throw new Error(`Failed to list repos for org ${org}`);
    const batch = (await resp.json()) as any[];
    if (batch.length === 0) break;
    repos.push(...batch.map((r: any) => r.name));
    if (batch.length < perPage) break;
    page += 1;
  }
  return repos;
}

function toBase64(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(input)));
}

function mergeFrontmatter(content: string, updated: Phase1FrontmatterState): string {
  const lines = content.split('\n');
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      const fm = JSON.stringify(updated, null, 2)
        .replace(/^\{\n|\n\}$/g, '')
        .replace(/^ {2}/gm, '');
      const newFm = ['---', fm, '---'].join('\n');
      return [newFm, ...lines.slice(end + 1)].join('\n');
    }
  }
  const fm = JSON.stringify(updated, null, 2)
    .replace(/^\{\n|\n\}$/g, '')
    .replace(/^ {2}/gm, '');
  return ['---', fm, '---', '', content].join('\n');
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const body = (await request.json()) as {
      documentId: string;
      params: Phase1Params; // may include github.sources[].excludePaths
      title: string;
    };

    const documentId = body.documentId;
    if (!documentId) return new ChatSDKError('bad_request:api').toResponse();

    // Accumulate markdown parts across sources
    let aggregatedMarkdown = `# Raw Context\n\n`;
    let themes: string[] = [];
    let workflows: string[] = [];

    // Process GitHub sources (if any)
    const ghSources = body.params.sources.filter((s: any) => s.type === 'github') as any[];
    if (ghSources.length) {
      const token = process.env.GITHUB_TOKEN;
      if (!token)
        throw new ChatSDKError('unauthorized:api', 'Missing GITHUB_TOKEN').toResponse();

      const ghParams = { sources: ghSources } as Phase1Params; // includes excludePaths if set

      // Expand wildcard repos per source
      for (const github of ghSources) {
        if (github.repos.length === 1 && github.repos[0] === '*') {
          github.repos = await listAllOrgRepos(github.org, token);
        }
      }

      const gh = await runPhase1(ghParams);
      aggregatedMarkdown += `## Source: GitHub\n\n${gh.content}\n`;
      themes = [...new Set([...themes, ...(gh.themes ?? [])])];
      workflows = [...new Set([...workflows, ...(gh.workflows ?? [])])];
    }

    // Process Google sources (if any)
    const googleSources = body.params.sources.filter((s: any) => s.type === 'google') as any[];
    if (googleSources.length) {
      aggregatedMarkdown += `\n\n## Source: Google\n\n`;
      // Inline fetch with refreshed access token
      const accessToken = await getValidGoogleAccessToken(session.user.id);

      for (const g of googleSources) {
        for (const f of g.files as Array<{ id: string; mimeType: string; name: string }>) {
          aggregatedMarkdown += `\n\n### ${f.name} (${f.id})\n\n`;
          if (f.mimeType === 'application/vnd.google-apps.document') {
            const resp = await fetch(
              `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}/export?mimeType=text/html`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            if (!resp.ok) throw new Error(`Failed to export Doc ${f.id}`);
            const html = await resp.text();
            const text = html
              .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
              .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
              .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
              .replace(/<br\s*\/?>(?!)/g, '\n')
              .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
              .replace(/<[^>]+>/g, '')
              .trim();
            aggregatedMarkdown += text;
          } else if (f.mimeType === 'application/vnd.google-apps.spreadsheet') {
            const metaResp = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(f.id)}`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            if (!metaResp.ok) throw new Error(`Failed to read spreadsheet ${f.id}`);
            const meta = await metaResp.json();
            const sheets: Array<{ properties: { title: string } }> = meta.sheets ?? [];
            for (const s of sheets) {
              const title = s.properties?.title ?? 'Sheet';
              const valuesResp = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(f.id)}/values/${encodeURIComponent(title)}?majorDimension=ROWS`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
              );
              if (!valuesResp.ok) throw new Error(`Failed to read sheet ${title}`);
              const values = (await valuesResp.json()).values as any[][];
              const header = values?.[0] ?? [];
              const rows = (values ?? []).slice(1);
              const sep = header.map(() => '---');
              const esc = (v: any) => String(v ?? '').replace(/\|/g, '\\|');
              aggregatedMarkdown += `\n\n#### ${title}\n\n`;
              if (header.length > 0) {
                aggregatedMarkdown += `| ${header.map(esc).join(' | ')} |\n`;
                aggregatedMarkdown += `| ${sep.join(' | ')} |\n`;
                for (const r of rows) aggregatedMarkdown += `| ${r.map(esc).join(' | ')} |\n`;
              } else {
                aggregatedMarkdown += `_Empty sheet_\n`;
              }
            }
          } else {
            aggregatedMarkdown += '_Unsupported file type in this phase_\n';
          }
        }
      }
    }

    // Process Guru sources (if any)
    const guruSources = body.params.sources.filter((s: any) => s.type === 'guru') as any[];
    if (guruSources.length) {
      aggregatedMarkdown += `\n\n## Source: Guru\n\n`;
      const token = process.env.GURU_AUTH_TOKEN;
      if (!token) throw new ChatSDKError('unauthorized:api', 'Missing GURU_AUTH_TOKEN').toResponse();

      for (const g of guruSources) {
        for (const c of (g.cards as Array<{ id: string; title?: string }>)) {
          const resp = await fetch(`https://api.getguru.com/api/v1/cards/${encodeURIComponent(c.id)}`, {
            headers: {
              accept: 'application/json',
              authorization: `Basic ${token}`,
              'User-Agent': 'PeakWatch-KnowledgeAgent/1.0.0',
            },
          });
          if (!resp.ok) throw new Error(`Failed to read Guru card ${c.id}`);
          const card = await resp.json();
          const title = card.preferredPhrase || c.title || 'Untitled Card';
          const plain = (card.content || '')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
            .replace(/<br\s*\/?>(?!)/g, '\n')
            .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
            .replace(/<[^>]+>/g, '')
            .trim();
          aggregatedMarkdown += `\n\n### ${title} (${c.id})\n\n${plain || '_No content_'}\n`;
        }
      }
    }

    const fmState: Phase1FrontmatterState = {
      phaseState: {
        phase: 'phase-1',
        status: 'awaiting_approval',
        params: body.params, // persist full params, including excludePaths
        artifacts: [
          {
            id: documentId,
            kind: 'text',
            title: body.title,
          },
        ],
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    const contentWithFm = mergeFrontmatter(aggregatedMarkdown, fmState);

    await saveDocument({
      id: documentId,
      content: contentWithFm,
      title: body.title,
      kind: 'text',
      userId: session.user.id,
    });

    const download = {
      fileName: `${body.title.replace(/[^a-z0-9\-]+/gi, '_')}.md`,
      mimeType: 'text/markdown',
      contentBase64: toBase64(contentWithFm),
      documentId,
    };

    const summary = `Sources: ${body.params.sources.length}`;

    return new Response(
      JSON.stringify({ id: documentId, download, summary }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  } catch (error) {
    return new ChatSDKError(
      'bad_request:api',
      error instanceof Error ? error.message : undefined,
    ).toResponse();
  }
}

export async function PATCH(request: Request) {
  // Approve flow: flip status to complete
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const body = (await request.json()) as { documentId: string };
    if (!body.documentId) return new ChatSDKError('bad_request:api').toResponse();

    const docs = await getDocumentsById({ id: body.documentId });
    const [doc] = docs;
    if (!doc) return new ChatSDKError('not_found:document').toResponse();

    if (doc.userId !== session.user.id)
      return new ChatSDKError('forbidden:document').toResponse();

    const updated = mergeFrontmatter(doc.content ?? '', {
      phaseState: {
        phase: 'phase-1',
        status: 'complete',
        params: JSON.parse('{}'),
        artifacts: JSON.parse('[]'),
        lastUpdatedAt: new Date().toISOString(),
      },
    } as unknown as Phase1FrontmatterState);

    await saveDocument({
      id: doc.id,
      content: updated,
      title: doc.title,
      kind: 'text',
      userId: session.user.id,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 