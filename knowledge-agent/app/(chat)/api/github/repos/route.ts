import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const token = process.env.GITHUB_TOKEN;
    if (!token) return new ChatSDKError('unauthorized:api', 'Missing GITHUB_TOKEN').toResponse();

    const org = 'peak-watch';
    const repos: Array<{ name: string; fullName: string; private: boolean }> = [];

    let page = 1;
    const perPage = 100;
    while (true) {
      const resp = await fetch(
        `https://api.github.com/orgs/${org}/repos?per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'GuruAgent/1.0.0',
          },
        },
      );
      if (!resp.ok) return new ChatSDKError('bad_request:api', 'Failed to fetch repos').toResponse();
      const batch = (await resp.json()) as any[];
      if (batch.length === 0) break;
      repos.push(
        ...batch.map((r: any) => ({ name: r.name, fullName: r.full_name, private: !!r.private })),
      );
      if (batch.length < perPage) break;
      page += 1;
    }

    return new Response(JSON.stringify({ repos }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 