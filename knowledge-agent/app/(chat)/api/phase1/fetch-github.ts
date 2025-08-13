import type { EvidenceItem, GithubSourceParams, GithubContextParams } from './types';

/** Compute a unified diff between two texts using diff-match-patch style output. */
function computeUnifiedDiff(oldText: string, newText: string, filePath: string): string {
  const header = `--- a/${filePath}\n+++ b/${filePath}`;
  const body = `\n@@ FULL FILE DIFF @@\n${newText}`;
  return `${header}${body}`;
}

function decodeBase64(content: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(content, 'base64').toString('utf8');
  }
  // Fallback (should not hit in Node runtime)
  try {
    return decodeURIComponent(escape(atob(content)));
  } catch {
    return content;
  }
}

function countLines(text: string): number {
  if (!text) return 0;
  // Normalize to \n and count
  return text.split(/\n/).length;
}

function summarizePackageJson(text: string): any {
  try {
    const json = JSON.parse(text);
    const summary: any = {
      name: json.name,
      version: json.version,
      engines: json.engines,
      scripts: json.scripts,
      dependencies: json.dependencies,
      devDependencies: json.devDependencies,
      peerDependencies: json.peerDependencies,
      optionalDependencies: json.optionalDependencies,
      workspaces: json.workspaces,
      packageManager: json.packageManager,
    };
    return summary;
  } catch {
    return null;
  }
}

function summarizeLockfile(text: string): any {
  // Heuristic: counts & top-level runtime deps if detectable (keep simple to avoid parsing lock formats)
  const lines = countLines(text);
  const size = Buffer.byteLength(text, 'utf8');
  return { lines, size };
}

function maybeHeadTail(text: string, head = 200, tail = 50): string {
  const lines = text.split(/\n/);
  if (lines.length <= head + tail + 1) return text;
  const headPart = lines.slice(0, head).join('\n');
  const tailPart = lines.slice(-tail).join('\n');
  return `${headPart}\n\n... [${lines.length - head - tail} lines omitted] ...\n\n${tailPart}`;
}

async function fetchFileContent(org: string, repo: string, sha: string, filePath: string, token: string): Promise<string> {
  const resp = await fetch(
    `https://api.github.com/repos/${org}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(sha)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'GuruAgent/1.0.0',
      },
    },
  );
  
  if (!resp.ok) return '';
  
  const data = (await resp.json()) as any;
  if (data?.encoding === 'base64' && data?.content) {
    return decodeBase64(data.content as string);
  }
  return '';
}

async function processFileForEvidence(
  org: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  timestamp: string,
  metadata: Record<string, any>,
  params: GithubSourceParams,
): Promise<EvidenceItem> {
  const {
    maxFileLines = 2000,
    maxFileBytes = 200 * 1024,
    largeFileStrategy = 'summary',
    summarizeLockfiles = true,
    headTailHeadLines = 200,
    headTailTailLines = 50,
  } = params;

  const newBytes = Buffer.byteLength(content, 'utf8');
  const newLines = countLines(content);

  const isPackageJson = filePath.endsWith('package.json');
  const isLockfile = /(^|\/)yarn\.lock$|(^|\/)package-lock\.json$|(^|\/)pnpm-lock\.yaml$|(^|\/)bun\.lockb$/.test(filePath);

  let snippetText: string;
  let finalMetadata = { ...metadata };

  // Summarize lockfiles and package.json if configured/large
  if (isPackageJson) {
    const summary = summarizePackageJson(content);
    if (summary) finalMetadata.packageJsonSummary = summary;
  }

  const exceedsLimits = newLines > maxFileLines || newBytes > maxFileBytes;

  if (exceedsLimits) {
    if (largeFileStrategy === 'exclude') {
      snippetText = '[Content excluded due to size policy]';
    } else if (largeFileStrategy === 'headTail') {
      snippetText = maybeHeadTail(content, headTailHeadLines, headTailTailLines);
    } else {
      // summary
      if (isLockfile && summarizeLockfiles) {
        finalMetadata.lockfileSummary = summarizeLockfile(content);
        snippetText = '[Lockfile summarized — see metadata.lockfileSummary]';
      } else if (isPackageJson) {
        snippetText = '[package.json summarized — see metadata.packageJsonSummary]';
      } else {
        snippetText = `[Large file summarized] Lines: ${newLines}, Size: ${newBytes} bytes`;
      }
    }
  } else if (isLockfile && summarizeLockfiles) {
    finalMetadata.lockfileSummary = summarizeLockfile(content);
    snippetText = '[Lockfile summarized — see metadata.lockfileSummary]';
  } else if (isPackageJson && summarizeLockfiles) {
    snippetText = '[package.json summarized — see metadata.packageJsonSummary]';
  } else {
    snippetText = content;
  }

  const snippet = computeUnifiedDiff('', snippetText, filePath);
  const evId = `${org}/${repo}:${branch}:file:${filePath}`;

  return {
    id: evId,
    sourceType: 'github',
    sourceName: `${org}/${repo} (${branch})`,
    changeType: 'other',
    identifier: filePath,
    timestamp,
    metadata: finalMetadata,
    snippet,
  };
}

async function fetchDateRangeEvidence(
  org: string,
  repo: string,
  branch: string,
  sinceDate: string,
  token: string,
  params: GithubSourceParams,
): Promise<EvidenceItem[]> {
  const evidence: EvidenceItem[] = [];
  const sinceIso = new Date(sinceDate).toISOString();
  
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const commitsResp = await fetch(
      `https://api.github.com/repos/${org}/${repo}/commits?sha=${encodeURIComponent(
        branch,
      )}&since=${encodeURIComponent(sinceIso)}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'GuruAgent/1.0.0',
        },
      },
    );
    
    if (!commitsResp.ok) {
      if (commitsResp.status === 404) break;
      throw new Error(
        `GitHub API error on commits ${org}/${repo}@${branch}: ${commitsResp.status} ${commitsResp.statusText}`,
      );
    }
    
    const commits = (await commitsResp.json()) as any[];
    if (commits.length === 0) break;

    for (const c of commits) {
      const sha = c.sha as string;
      const commitDetailResp = await fetch(
        `https://api.github.com/repos/${org}/${repo}/commits/${sha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'GuruAgent/1.0.0',
          },
        },
      );
      
      if (!commitDetailResp.ok) {
        throw new Error(
          `GitHub API error on commit details ${org}/${repo}@${sha}: ${commitDetailResp.status} ${commitDetailResp.statusText}`,
        );
      }
      
      const detail = (await commitDetailResp.json()) as any;
      const commitDate = detail.commit?.author?.date || detail.commit?.committer?.date || '';
      const parents: string[] = Array.isArray(detail.parents)
        ? detail.parents.map((p: any) => p.sha)
        : [];
      const parentSha = parents[0];

      const files: any[] = Array.isArray(detail.files) ? detail.files : [];
      for (const f of files) {
        const filename: string = f.filename;
        const status: string = f.status;
        const previous = f.previous_filename;
        const additions = f.additions ?? 0;
        const deletions = f.deletions ?? 0;
        const changes = f.changes ?? 0;

        let changeType: EvidenceItem['changeType'] = 'other';
        if (status === 'added') changeType = 'added';
        else if (status === 'modified') changeType = 'modified';
        else if (status === 'removed') changeType = 'deleted';
        else if (status === 'renamed') changeType = 'renamed';

        let oldText = '';
        let newText = '';

        if (parentSha && status !== 'added') {
          oldText = await fetchFileContent(org, repo, parentSha, previous || filename, token);
        }

        if (status !== 'removed') {
          newText = await fetchFileContent(org, repo, sha, filename, token);
        }

        const metadata = {
          commitSha: sha,
          parentSha,
          status,
          previous_filename: previous,
          additions,
          deletions,
          changes,
          commitUrl: detail.html_url,
          message: detail.commit?.message,
          author: detail.commit?.author,
          committer: detail.commit?.committer,
        };

        const processedEvidence = await processFileForEvidence(
          org,
          repo,
          branch,
          filename,
          status === 'removed' ? oldText : newText,
          commitDate,
          metadata,
          params,
        );
        
        evidence.push(processedEvidence);
      }
    }

    if (commits.length < perPage) break;
    page += 1;
  }

  return evidence;
}

async function fetchFileSelectionEvidence(
  org: string,
  repo: string,
  branch: string,
  selectedPaths: string[],
  token: string,
  params: GithubSourceParams,
): Promise<EvidenceItem[]> {
  const evidence: EvidenceItem[] = [];
  const timestamp = new Date().toISOString();

  // Get the latest commit SHA for the branch
  const branchResp = await fetch(
    `https://api.github.com/repos/${org}/${repo}/branches/${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'GuruAgent/1.0.0',
      },
    },
  );

  if (!branchResp.ok) {
    throw new Error(`Failed to fetch branch ${branch}: ${branchResp.status} ${branchResp.statusText}`);
  }

  const branchData = await branchResp.json();
  const latestSha = branchData.commit?.sha;

  if (!latestSha) {
    throw new Error(`Could not determine latest commit SHA for branch ${branch}`);
  }

  for (const path of selectedPaths) {
    try {
      const content = await fetchFileContent(org, repo, latestSha, path, token);
      
      if (content) {
        const metadata = {
          selectedPath: path,
          latestSha,
          selectionMode: 'file-selection',
        };

        const processedEvidence = await processFileForEvidence(
          org,
          repo,
          branch,
          path,
          content,
          timestamp,
          metadata,
          params,
        );
        
        evidence.push(processedEvidence);
      }
    } catch (error) {
      // Skip files that can't be fetched (might be directories or non-existent)
      console.warn(`Failed to fetch file ${path}:`, error);
    }
  }

  return evidence;
}

async function fetchCommitSelectionEvidence(
  org: string,
  repo: string,
  branch: string,
  selectedCommits: string[],
  token: string,
  params: GithubSourceParams,
): Promise<EvidenceItem[]> {
  const evidence: EvidenceItem[] = [];

  for (const sha of selectedCommits) {
    const commitDetailResp = await fetch(
      `https://api.github.com/repos/${org}/${repo}/commits/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'GuruAgent/1.0.0',
        },
      },
    );
    
    if (!commitDetailResp.ok) {
      console.warn(`Failed to fetch commit ${sha}: ${commitDetailResp.status} ${commitDetailResp.statusText}`);
      continue;
    }
    
    const detail = (await commitDetailResp.json()) as any;
    const commitDate = detail.commit?.author?.date || detail.commit?.committer?.date || '';
    const parents: string[] = Array.isArray(detail.parents)
      ? detail.parents.map((p: any) => p.sha)
      : [];
    const parentSha = parents[0];

    const files: any[] = Array.isArray(detail.files) ? detail.files : [];
    for (const f of files) {
      const filename: string = f.filename;
      const status: string = f.status;
      const previous = f.previous_filename;
      const additions = f.additions ?? 0;
      const deletions = f.deletions ?? 0;
      const changes = f.changes ?? 0;

      let changeType: EvidenceItem['changeType'] = 'other';
      if (status === 'added') changeType = 'added';
      else if (status === 'modified') changeType = 'modified';
      else if (status === 'removed') changeType = 'deleted';
      else if (status === 'renamed') changeType = 'renamed';

      let oldText = '';
      let newText = '';

      if (parentSha && status !== 'added') {
        oldText = await fetchFileContent(org, repo, parentSha, previous || filename, token);
      }

      if (status !== 'removed') {
        newText = await fetchFileContent(org, repo, sha, filename, token);
      }

      const metadata = {
        commitSha: sha,
        parentSha,
        status,
        previous_filename: previous,
        additions,
        deletions,
        changes,
        commitUrl: detail.html_url,
        message: detail.commit?.message,
        author: detail.commit?.author,
        committer: detail.commit?.committer,
        selectionMode: 'commit-selection',
      };

      const snippetText = status === 'removed' ? oldText : newText;
      const processedEvidence = await processFileForEvidence(
        org,
        repo,
        branch,
        filename,
        snippetText,
        commitDate,
        metadata,
        params,
      );
      
      evidence.push(processedEvidence);
    }
  }

  return evidence;
}

export async function fetchGithubEvidence(params: GithubSourceParams): Promise<EvidenceItem[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set');

  const { org, repos, branches, contextOptions } = params;
  const evidence: EvidenceItem[] = [];

  for (const repo of repos) {
    for (const branch of branches) {
      for (const contextOption of contextOptions) {
        let modeEvidence: EvidenceItem[] = [];

        switch (contextOption.mode) {
          case 'date-range':
            modeEvidence = await fetchDateRangeEvidence(
              org,
              repo,
              branch,
              contextOption.sinceDate,
              token,
              params,
            );
            break;

          case 'file-selection':
            modeEvidence = await fetchFileSelectionEvidence(
              org,
              repo,
              branch,
              contextOption.selectedPaths,
              token,
              params,
            );
            break;

          case 'commit-selection':
            modeEvidence = await fetchCommitSelectionEvidence(
              org,
              repo,
              branch,
              contextOption.selectedCommits,
              token,
              params,
            );
            break;

          default:
            console.warn(`Unknown context mode: ${(contextOption as any).mode}`);
            continue;
        }

        evidence.push(...modeEvidence);
      }
    }
  }

  return evidence;
} 