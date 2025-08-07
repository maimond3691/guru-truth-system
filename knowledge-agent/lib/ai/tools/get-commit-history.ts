import { tool } from 'ai';
import { z } from 'zod';

export const getCommitHistory = tool({
  description: 'Get commit history for a repository in the peak-watch organization with filtering and pagination options',
  inputSchema: z.object({
    repo: z.string().describe('Repository name (without .git extension)'),
    sha: z.string().optional().describe('SHA or branch to start listing commits from (defaults to main branch)'),
    path: z.string().optional().describe('Only commits containing this file path will be returned'),
    author: z.string().optional().describe('GitHub username or email address to filter by commit author'),
    committer: z.string().optional().describe('GitHub username or email address to filter by commit committer'),
    since: z.string().optional().describe('Only commits after this date (ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ)'),
    until: z.string().optional().describe('Only commits before this date (ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ)'),
    maxResults: z.number().optional().default(30).describe('Maximum number of commits to return (1-100)')
  }),
  execute: async ({ repo, sha, path, author, committer, since, until, maxResults = 30 }) => {
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    // Ensure maxResults is within API limits
    const limitedResults = Math.min(Math.max(maxResults, 1), 100);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (sha) params.append('sha', sha);
      if (path) params.append('path', path);
      if (author) params.append('author', author);
      if (committer) params.append('committer', committer);
      if (since) params.append('since', since);
      if (until) params.append('until', until);
      params.append('per_page', limitedResults.toString());

      const url = `https://api.github.com/repos/peak-watch/${repo}/commits?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'PeakWatch-KnowledgeAgent/1.0.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository "peak-watch/${repo}" not found or not accessible`);
        } else if (response.status === 409) {
          throw new Error('Git repository is empty or the commit SHA is invalid');
        } else if (response.status === 500) {
          throw new Error('GitHub internal server error - try again later');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const commits = await response.json();
      
      // Return simplified commit information
      return {
        repository: `peak-watch/${repo}`,
        branch: sha || 'default branch',
        filters: {
          path: path || null,
          author: author || null,
          committer: committer || null,
          since: since || null,
          until: until || null
        },
        totalReturned: commits.length,
        maxResults: limitedResults,
        commits: commits.map((commit: any) => ({
          sha: commit.sha,
          shortSha: commit.sha.substring(0, 7),
          message: commit.commit.message,
          author: {
            name: commit.commit.author?.name,
            email: commit.commit.author?.email,
            date: commit.commit.author?.date,
            githubUser: commit.author ? {
              login: commit.author.login,
              id: commit.author.id,
              avatarUrl: commit.author.avatar_url,
              htmlUrl: commit.author.html_url
            } : null
          },
          committer: {
            name: commit.commit.committer?.name,
            email: commit.commit.committer?.email,
            date: commit.commit.committer?.date,
            githubUser: commit.committer ? {
              login: commit.committer.login,
              id: commit.committer.id,
              avatarUrl: commit.committer.avatar_url,
              htmlUrl: commit.committer.html_url
            } : null
          },
          urls: {
            commit: commit.html_url,
            api: commit.url,
            comments: commit.comments_url
          },
          stats: {
            commentCount: commit.commit.comment_count
          },
          verification: commit.commit.verification ? {
            verified: commit.commit.verification.verified,
            reason: commit.commit.verification.reason,
            signature: commit.commit.verification.signature ? 'Present' : null,
            verifiedAt: commit.commit.verification.verified_at
          } : null,
          parents: commit.parents?.map((parent: any) => ({
            sha: parent.sha,
            shortSha: parent.sha.substring(0, 7),
            url: parent.html_url
          })) || []
        }))
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch commit history: ${error.message}`);
      }
      throw new Error('Failed to fetch commit history: Unknown error occurred');
    }
  },
});