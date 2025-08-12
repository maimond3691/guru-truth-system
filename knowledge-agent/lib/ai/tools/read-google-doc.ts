import { z } from 'zod';
import { tool, type UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import { getValidGoogleAccessToken } from '@/lib/db/queries';
import type { Session } from 'next-auth';

interface ReadGoogleDocProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

function htmlToMarkdownSimple(html: string): string {
  // Very minimal conversion; replace with Turndown or rich conversion later
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
    .replace(/<br\s*\/>/g, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export const readGoogleDoc = ({ session }: ReadGoogleDocProps) =>
  tool({
    description: 'Read a Google Doc and return Markdown content.',
    inputSchema: z.object({ fileId: z.string() }),
    execute: async ({ fileId }: { fileId: string }) => {
      const accessToken = await getValidGoogleAccessToken(session.user.id);

      const resp = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/html`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!resp.ok) throw new Error('Failed to export Google Doc');
      const html = await resp.text();
      const md = htmlToMarkdownSimple(html);
      return { markdown: md };
    },
  }); 