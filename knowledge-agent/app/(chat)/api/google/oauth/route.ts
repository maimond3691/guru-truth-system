import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getOAuthToken } from '@/lib/db/queries';

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      try {
        const token = await getOAuthToken({ provider: 'google', userId: session.user.id });
        return Response.json({ connected: !!token }, { status: 200 });
      } catch {
        // If DB is unreachable or not configured, treat as not connected instead of 500
        return Response.json({ connected: false }, { status: 200 });
      }
    }

    if (action === 'start') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
      if (!clientId || !redirectUri)
        return new ChatSDKError('bad_request:api', 'Missing Google OAuth config').toResponse();

      const url = new URL(GOOGLE_OAUTH_BASE);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set(
        'scope',
        [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/drive.metadata.readonly',
          'https://www.googleapis.com/auth/documents.readonly',
          'https://www.googleapis.com/auth/spreadsheets.readonly',
        ].join(' '),
      );

      return Response.json({ authUrl: url.toString() }, { status: 200 });
    }

    return new ChatSDKError('bad_request:api').toResponse();
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 