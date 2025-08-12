import { tool } from 'ai';
import { z } from 'zod';

export const listBranches = tool({
  description: 'List branches for a given repository in the peak-watch organization',
  inputSchema: z.object({
    repo: z.string().describe('Repository name (e.g., "dashboard")'),
    perPage: z.number().optional().default(100),
  }),
  execute: async ({ repo, perPage = 100 }: { repo: string; perPage?: number }) => {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    const branches: Array<{ name: string; protected: boolean; commitSha: string }> = [];

    try {
      let page = 1;
      while (true) {
        const url = `https://api.github.com/repos/peak-watch/${repo}/branches?per_page=${perPage}&page=${page}`;
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
            throw new Error(`Repository "${repo}" not found`);
          }
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const batch = (await response.json()) as any[];
        if (batch.length === 0) break;

        for (const b of batch) {
          branches.push({ name: b.name, protected: Boolean(b.protected), commitSha: b.commit?.sha });
        }

        if (batch.length < perPage) break;
        page += 1;
      }

      return branches;
    } catch (error) {
      throw new Error(
        `Failed to list branches for ${repo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
}); 