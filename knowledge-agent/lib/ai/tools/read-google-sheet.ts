import { z } from 'zod';
import { tool, type UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import { getValidGoogleAccessToken } from '@/lib/db/queries';
import type { Session } from 'next-auth';

interface ReadGoogleSheetProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

function arrayToMarkdownTable(values: any[][]): string {
  if (!values || values.length === 0) return '_Empty sheet_\n';
  const header = values[0] || [];
  const rows = values.slice(1);
  const sep = header.map(() => '---');
  const escapeCell = (v: any) => String(v ?? '').replace(/\|/g, '\\|');
  return `${[
    `| ${header.map(escapeCell).join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(escapeCell).join(' | ')} |`),
  ].join('\n')}\n`;
}

export const readGoogleSheet = ({ session }: ReadGoogleSheetProps) =>
  tool({
    description: 'Read a Google Sheet and return Markdown per sheet/tab.',
    inputSchema: z.object({ spreadsheetId: z.string() }),
    execute: async ({ spreadsheetId }: { spreadsheetId: string }) => {
      const accessToken = await getValidGoogleAccessToken(session.user.id);

      const metaResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!metaResp.ok) throw new Error('Failed to read spreadsheet metadata');
      const meta = await metaResp.json();
      const sheets: Array<{ properties: { title: string } }> = meta.sheets ?? [];

      let markdown = '';
      for (const s of sheets) {
        const title = s.properties?.title ?? 'Sheet';
        const valuesResp = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(title)}?majorDimension=ROWS`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!valuesResp.ok) throw new Error(`Failed to read sheet ${title}`);
        const values = (await valuesResp.json()).values as any[][];
        markdown += `\n\n### ${title}\n\n${arrayToMarkdownTable(values)}`;
      }

      return { markdown };
    },
  }); 