import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { saveDocument } from '@/lib/db/queries';
import type { Phase1FrontmatterState } from '@/lib/phase1/types';
import { getOAuthToken } from '@/lib/db/queries';
import { getValidGoogleAccessToken } from '@/lib/db/queries';

function toBase64(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64');
  }
  // @ts-ignore
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
      title: string;
      files: Array<{ id: string; mimeType: string; name: string }>;
    };

    if (!body?.documentId || !body?.files?.length)
      return new ChatSDKError('bad_request:api', 'Missing documentId or files').toResponse();

    const token = await getOAuthToken({ provider: 'google', userId: session.user.id });
    if (!token?.accessToken) return new ChatSDKError('unauthorized:api', 'Google not connected').toResponse();
    const accessToken = await getValidGoogleAccessToken(session.user.id);

    let markdown = `# Google Assets\n\n`;

    for (const f of body.files) {
      markdown += `\n\n## ${f.name} (${f.id})\n\n`;
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
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
          .replace(/<[^>]+>/g, '')
          .trim();
        markdown += text;
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
          const escapeCell = (v: any) => String(v ?? '').replace(/\|/g, '\\|');
          markdown += `\n\n### ${title}\n\n`;
          markdown += `| ${header.map(escapeCell).join(' | ')} |\n`;
          markdown += `| ${sep.join(' | ')} |\n`;
          for (const r of rows) markdown += `| ${r.map(escapeCell).join(' | ')} |\n`;
        }
      } else {
        markdown += '_Unsupported file type in this phase_\n';
      }
    }

    const fmState: Phase1FrontmatterState = {
      phaseState: {
        phase: 'phase-1',
        status: 'awaiting_approval',
        params: { sources: [{ type: 'github', org: '', repos: [], branches: [], sinceDate: '' }] } as any,
        artifacts: [
          { id: body.documentId, kind: 'text', title: body.title },
        ],
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    const contentWithFm = mergeFrontmatter(markdown, fmState);

    await saveDocument({
      id: body.documentId,
      title: body.title,
      kind: 'text',
      content: contentWithFm,
      userId: session.user.id,
    });

    const download = {
      fileName: `${body.title.replace(/[^a-z0-9\-]+/gi, '_')}.md`,
      mimeType: 'text/markdown',
      contentBase64: toBase64(contentWithFm),
      documentId: body.documentId,
    };

    const summary = `Files: ${body.files.length}`;

    return new Response(
      JSON.stringify({ id: body.documentId, download, summary }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 