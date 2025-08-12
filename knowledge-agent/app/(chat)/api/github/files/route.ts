import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

interface FileItem {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

async function getRepoContents(org: string, repo: string, branch: string, path = '', token: string): Promise<FileItem[]> {
  const url = `https://api.github.com/repos/${org}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GuruAgent/1.0.0',
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch contents: ${resp.status} ${resp.statusText}`);
  }

  const contents = await resp.json() as any[];
  
  if (!Array.isArray(contents)) {
    return []; // Single file case, not a directory
  }

  return contents.map((item: any) => ({
    path: item.path,
    type: item.type === 'dir' ? 'dir' : 'file',
    size: item.size || undefined,
  }));
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
    const path = searchParams.get('path') || '';

    if (!repo) return new ChatSDKError('bad_request:api', 'Missing repo parameter').toResponse();

    const org = 'peak-watch';
    const files = await getRepoContents(org, repo, branch, path, token);

    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api', error instanceof Error ? error.message : 'Unknown error').toResponse();
  }
} 