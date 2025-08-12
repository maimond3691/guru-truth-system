import { tool } from 'ai';
import { z } from 'zod';

export const readFile = tool({
  description: 'Read the contents of a specific file from a repository',
  inputSchema: z.object({
    repo: z.string().describe('Repository name (e.g., "dashboard", "stylegan2-pytorch")'),
    filePath: z.string().describe('Path to the file within the repository (e.g., "README.md", "src/app.ts")')
  }),
  execute: async ({ repo, filePath }) => {
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    try {
      const url = `https://api.github.com/repos/peak-watch/${repo}/contents/${filePath}`;
      
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
          throw new Error(`File "${filePath}" not found in repository "${repo}"`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const fileData = await response.json();
      
      // Check if it's a file (not a directory)
      if (fileData.type !== 'file') {
        throw new Error(`"${filePath}" is not a file (it's a ${fileData.type})`);
      }

      // Decode base64 content if available
      let decodedContent = null;
      if (fileData.content && fileData.encoding === 'base64') {
        try {
          decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        } catch (error) {
          // Handle binary files that can't be decoded as UTF-8
          decodedContent = '[Binary file - content cannot be displayed as text]';
        }
      }

      return {
        name: fileData.name,
        path: fileData.path,
        size: fileData.size,
        sha: fileData.sha,
        encoding: fileData.encoding,
        content: decodedContent,
        downloadUrl: fileData.download_url,
        htmlUrl: fileData.html_url,
        lastModified: 'Use commits API to get modification history'
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});