import { tool } from 'ai';
import { z } from 'zod';

export const getCommitHistory = tool({
  description:
    'List commits for a repository branch since a given ISO date, including basic metadata and changed files',
  inputSchema: z.object({
    repo: z.string().describe('Repository name (e.g., "dashboard")'),
    branch: z.string().describe('Branch name (e.g., "main")'),
    sinceDate: z.string().describe('ISO date string, e.g., 2025-01-01'),
    perPage: z.number().optional().default(100),
  }),
  execute: async ({
    repo,
    branch,
    sinceDate,
    perPage = 100,
  }: {
    repo: string;
    branch: string;
    sinceDate: string;
    perPage?: number;
  }) => {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    const commits: Array<{
      sha: string;
      author: { name: string | null; email: string | null } | null;
      committer: { name: string | null; email: string | null } | null;
      message: string;
      date: string;
      htmlUrl: string;
      parents: string[];
      files?: Array<{
        filename: string;
        status: 'added' | 'modified' | 'removed' | 'renamed';
        previous_filename?: string;
        additions: number;
        deletions: number;
        changes: number;
        raw_url?: string;
        blob_url?: string;
      }>;
    }> = [];

    try {
      let page = 1;
      const sinceIso = new Date(sinceDate).toISOString();

      // 1) page through commits
      while (true) {
        const url = `https://api.github.com/repos/peak-watch/${repo}/commits?sha=${encodeURIComponent(
          branch,
        )}&since=${encodeURIComponent(sinceIso)}&per_page=${perPage}&page=${page}`;

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
            throw new Error(`Repository or branch not found: ${repo}@${branch}`);
          }
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const batch = (await response.json()) as any[];
        if (batch.length === 0) break;

        for (const item of batch) {
          const sha = item.sha as string;

          // 2) for each commit, fetch details (files, parents)
          const detailResp = await fetch(
            `https://api.github.com/repos/peak-watch/${repo}/commits/${sha}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'GuruAgent/1.0.0',
              },
            },
          );
          if (!detailResp.ok) {
            throw new Error(
              `GitHub API error on commit details: ${detailResp.status} ${detailResp.statusText}`,
            );
          }
          const detail = (await detailResp.json()) as any;

          commits.push({
            sha,
            author: detail.commit?.author
              ? { name: detail.commit.author.name, email: detail.commit.author.email }
              : null,
            committer: detail.commit?.committer
              ? { name: detail.commit.committer.name, email: detail.commit.committer.email }
              : null,
            message: detail.commit?.message ?? '',
            date: detail.commit?.author?.date ?? detail.commit?.committer?.date ?? '',
            htmlUrl: detail.html_url,
            parents: Array.isArray(detail.parents) ? detail.parents.map((p: any) => p.sha) : [],
            files: Array.isArray(detail.files)
              ? detail.files.map((f: any) => ({
                  filename: f.filename,
                  status: f.status,
                  previous_filename: f.previous_filename,
                  additions: f.additions,
                  deletions: f.deletions,
                  changes: f.changes,
                  raw_url: f.raw_url,
                  blob_url: f.blob_url,
                }))
              : [],
          });
        }

        if (batch.length < perPage) break;
        page += 1;
      }

      return { repo, branch, sinceDate: sinceIso, commits };
    } catch (error) {
      throw new Error(
        `Failed to get commit history for ${repo}@${branch}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
});