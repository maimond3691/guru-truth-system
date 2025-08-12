import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getValidGoogleAccessToken } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const mimeTypes = searchParams.getAll('mimeTypes'); // allow multiple

    const accessToken = await getValidGoogleAccessToken(session.user.id);

    const params = new URLSearchParams();
    params.set(
      'fields',
      'files(id,name,mimeType,modifiedTime,parents,webViewLink),nextPageToken',
    );
    params.set('pageSize', '100');

    let builtQ = q;
    if (mimeTypes.length) {
      const typeExpr = `(${mimeTypes.map((m) => `mimeType='${m}'`).join(' or ')})`;
      builtQ = builtQ ? `${builtQ} and ${typeExpr}` : typeExpr;
    }
    if (builtQ) params.set('q', builtQ);

    const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}` , {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return new ChatSDKError('bad_request:api', 'Failed to list Drive files').toResponse();

    const data = await resp.json();
    return new Response(JSON.stringify({ files: data.files ?? [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 