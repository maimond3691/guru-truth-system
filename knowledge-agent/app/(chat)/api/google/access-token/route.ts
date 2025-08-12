import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getValidGoogleAccessToken } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const accessToken = await getValidGoogleAccessToken(session.user.id);

    return new Response(JSON.stringify({ accessToken }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 