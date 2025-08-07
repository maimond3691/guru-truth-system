import { tool } from 'ai';
import { z } from 'zod';

export const listFiles = tool({
  description: 'List files and directories in a specific repository path',
  inputSchema: z.object({
    repo: z.string().describe('Repository name (e.g., "dashboard", "stylegan2-pytorch")'),
    path: z.string().optional().default('').describe('Directory path within the repository (optional, defaults to root)')
  }),
  execute: async ({ repo, path = '' }) => {
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    try {
      const url = `https://api.github.com/repos/peak-watch/${repo}/contents/${path}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'GuruAgent/1.0.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository "${repo}" or path "${path}" not found`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const contents = await response.json();
      
      // Handle single file vs directory listing
      if (Array.isArray(contents)) {
        // Directory listing
        return {
          path: path || '/',
          type: 'directory',
          items: contents.map((item: any) => ({
            name: item.name,
            path: item.path,
            type: item.type, // 'file' or 'dir'
            size: item.size,
            sha: item.sha,
            downloadUrl: item.download_url,
            htmlUrl: item.html_url
          }))
        };
      } else {
        // Single file
        return {
          name: contents.name,
          path: contents.path,
          type: 'file',
          size: contents.size,
          sha: contents.sha,
          encoding: contents.encoding,
          downloadUrl: contents.download_url,
          htmlUrl: contents.html_url,
          content: contents.content ? 'Content available (use read-file tool to get decoded content)' : null
        };
      }
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});