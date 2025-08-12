import { tool } from 'ai';
import { z } from 'zod';

export const getFileBlob = tool({
  description:
    'Fetch a repository file content at a specific ref (commit sha or branch) using the GitHub contents API',
  inputSchema: z.object({
    repo: z.string().describe('Repository name (e.g., "dashboard")'),
    path: z.string().describe('File path within the repository'),
    ref: z.string().describe('Commit SHA or branch/tag name'),
  }),
  execute: async ({ repo, path, ref }) => {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    try {
      const url = `https://api.github.com/repos/peak-watch/${repo}/contents/${encodeURIComponent(
        path,
      )}?ref=${encodeURIComponent(ref)}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'GuruAgent/1.0.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { exists: false };
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const encoding = data.encoding as string | undefined;
      const content = data.content as string | undefined;

      return {
        exists: true,
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        encoding: encoding ?? null,
        content: content ?? null, // base64 when encoding === 'base64'
        downloadUrl: data.download_url,
        htmlUrl: data.html_url,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch file blob ${repo}/${path}@${ref}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
}); 