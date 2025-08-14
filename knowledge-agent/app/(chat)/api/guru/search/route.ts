import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  try {

    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const max = Number.parseInt(searchParams.get('max') || '20');

    const token = process.env.GURU_AUTH_TOKEN;
    if (!token) return new ChatSDKError('unauthorized:api', 'Missing GURU_AUTH_TOKEN').toResponse();

    const params = new URLSearchParams();
    if (q) params.set('searchTerms', q);
    params.set('maxResults', String(Math.min(Math.max(max, 1), 50)));
    params.set('showArchived', 'false');

    const resp = await fetch(`https://api.getguru.com/api/v1/search/query?${params.toString()}`, {
      headers: {
        accept: 'application/json',
        authorization: `Basic ${token}`,
        'User-Agent': 'PeakWatch-KnowledgeAgent/1.0.0',
      },
    });
    if (!resp.ok) return new ChatSDKError('bad_request:api', 'Failed to search Guru').toResponse();
    const data = await resp.json();

    const cards = (data || []).map((c: any) => ({ id: c.id, title: c.preferredPhrase || c.title || 'Untitled' }));

    return new Response(JSON.stringify({ cards }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 