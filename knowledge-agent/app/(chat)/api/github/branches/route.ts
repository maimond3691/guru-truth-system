import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const token = process.env.GITHUB_TOKEN;
    if (!token) return new ChatSDKError('unauthorized:api', 'Missing GITHUB_TOKEN').toResponse();

    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo');
    if (!repo) return new ChatSDKError('bad_request:api', 'Missing repo').toResponse();

    const branches: Array<{ name: string; protected: boolean; sha: string }> = [];

    let page = 1;
    const perPage = 100;
    while (true) {
      const resp = await fetch(
        `https://api.github.com/repos/peak-watch/${repo}/branches?per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'GuruAgent/1.0.0',
          },
        },
      );
      if (!resp.ok)
        return new ChatSDKError('bad_request:api', 'Failed to fetch branches').toResponse();
      const batch = (await resp.json()) as any[];
      if (batch.length === 0) break;
      branches.push(
        ...batch.map((b: any) => ({ name: b.name, protected: !!b.protected, sha: b.commit?.sha })),
      );
      if (batch.length < perPage) break;
      page += 1;
    }

    return new Response(JSON.stringify({ branches }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 