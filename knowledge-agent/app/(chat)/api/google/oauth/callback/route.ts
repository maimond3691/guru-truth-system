import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { upsertOAuthToken } from '@/lib/db/queries';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) return new ChatSDKError('bad_request:api').toResponse();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri)
    return new ChatSDKError('bad_request:api', 'Missing Google OAuth config').toResponse();

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenResp.ok) return new ChatSDKError('bad_request:api', 'Token exchange failed').toResponse();
  const tokenJson = await tokenResp.json();

  const accessToken = tokenJson.access_token as string;
  const refreshToken = (tokenJson.refresh_token as string) || null;
  const expiresIn = tokenJson.expires_in as number;
  const expiresAt = new Date(Date.now() + (expiresIn ?? 0) * 1000);

  await upsertOAuthToken({
    provider: 'google',
    userId: session.user.id,
    accessToken,
    refreshToken,
    expiresAt,
  });

  const successRedirect = new URL('/', request.url);
  successRedirect.searchParams.set('google_oauth', 'success');
  return Response.redirect(successRedirect);
} 