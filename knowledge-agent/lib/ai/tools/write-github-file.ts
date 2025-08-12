import { tool } from 'ai';
import { z } from 'zod';

export const writeGithubFile = tool({
  description: 'Create or update a file in a GitHub repository via the contents API',
  inputSchema: z.object({
    owner: z.string().default('peak-watch'),
    repo: z.string().describe('Repository name (e.g., "guru-truth-system")'),
    branch: z.string().default('main'),
    path: z.string().describe('File path to write, e.g., docs/raw-context/...'),
    message: z.string().describe('Commit message'),
    contentBase64: z.string().describe('File content encoded as base64'),
    sha: z.string().optional().describe('Existing file SHA if updating'),
  }),
  execute: async ({ owner = 'peak-watch', repo, branch = 'main', path, message, contentBase64, sha }) => {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    try {
      // IMPORTANT: encode each path segment, NOT the slashes
      const encodedPath = path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'GuruAgent/1.0.0',
        },
        body: JSON.stringify({
          message,
          content: contentBase64,
          branch,
          sha,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      return {
        content: data.content,
        commit: data.commit,
      };
    } catch (error) {
      throw new Error(
        `Failed to write file to ${owner}/${repo}@${branch}:${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
}); 