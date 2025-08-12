import { z } from 'zod';
import { tool, type UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import { getValidGoogleAccessToken } from '@/lib/db/queries';
import type { Session } from 'next-auth';

interface ListGoogleDriveFilesProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const listGoogleDriveFiles = ({ session }: ListGoogleDriveFilesProps) =>
  tool({
    description: 'List Google Drive files for the authenticated user by mimeTypes and query.',
    inputSchema: z.object({
      mimeTypes: z.array(z.string()).optional(),
      q: z.string().optional(),
    }),
    execute: async ({ mimeTypes, q }: { mimeTypes?: string[]; q?: string }) => {
      const accessToken = await getValidGoogleAccessToken(session.user.id);

      const params = new URLSearchParams();
      params.set(
        'fields',
        'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
      );
      params.set('pageSize', '100');

      let builtQ = q ?? '';
      if (mimeTypes?.length) {
        const typeExpr = `(${mimeTypes.map((m) => `mimeType='${m}'`).join(' or ')})`;
        builtQ = builtQ ? `${builtQ} and ${typeExpr}` : typeExpr;
      }
      if (builtQ) params.set('q', builtQ);

      const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) throw new Error('Failed to list Drive files');
      const data = await resp.json();
      return { files: data.files ?? [] };
    },
  }); 