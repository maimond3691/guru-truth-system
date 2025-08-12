import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

interface CommitItem {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const token = process.env.GITHUB_TOKEN;
    if (!token) return new ChatSDKError('unauthorized:api', 'Missing GITHUB_TOKEN').toResponse();

    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!repo) return new ChatSDKError('bad_request:api', 'Missing repo parameter').toResponse();

    const org = 'peak-watch';
    const commits: CommitItem[] = [];

    let page = 1;
    const perPage = Math.min(limit, 100);
    
    while (commits.length < limit) {
      const resp = await fetch(
        `https://api.github.com/repos/${org}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'GuruAgent/1.0.0',
          },
        },
      );

      if (!resp.ok) {
        return new ChatSDKError('bad_request:api', 'Failed to fetch commits').toResponse();
      }

      const batch = (await resp.json()) as any[];
      if (batch.length === 0) break;

      const batchCommits = batch.map((c: any) => ({
        sha: c.sha,
        message: c.commit?.message?.split('\n')[0] || 'No message', // First line only
        author: {
          name: c.commit?.author?.name || 'Unknown',
          email: c.commit?.author?.email || '',
          date: c.commit?.author?.date || '',
        },
        url: c.html_url,
      }));

      commits.push(...batchCommits.slice(0, limit - commits.length));
      
      if (batch.length < perPage) break;
      page += 1;
    }

    return new Response(JSON.stringify({ commits }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api', error instanceof Error ? error.message : 'Unknown error').toResponse();
  }
} 