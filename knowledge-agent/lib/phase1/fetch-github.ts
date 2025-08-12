import type { EvidenceItem, GithubSourceParams } from './types';

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

export async function fetchGithubEvidence({
  org,
  repos,
  branches,
  sinceDate,
  maxFileLines = 2000,
  maxFileBytes = 200 * 1024,
  largeFileStrategy = 'summary',
  summarizeLockfiles = true,
  headTailHeadLines = 200,
  headTailTailLines = 50,
}: GithubSourceParams): Promise<EvidenceItem[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set');

  const evidence: EvidenceItem[] = [];

  for (const repo of repos) {
    for (const branch of branches) {
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

            const status: string = f.status; // added | modified | removed | renamed
            const previous = f.previous_filename;
            const additions = f.additions ?? 0;
            const deletions = f.deletions ?? 0;
            const changes = f.changes ?? 0;
            const patch = f.patch as string | undefined;

            let changeType: EvidenceItem['changeType'] = 'other';
            if (status === 'added') changeType = 'added';
            else if (status === 'modified') changeType = 'modified';
            else if (status === 'removed') changeType = 'deleted';
            else if (status === 'renamed') changeType = 'renamed';

            let oldText = '';
            let newText = '';

            // Fast-path: if file is large (by changes as proxy), prefer summary without fetching blobs
            // but for correctness, we fetch head to compute strategies below.

            if (parentSha && status !== 'added') {
              const baseResp = await fetch(
                `https://api.github.com/repos/${org}/${repo}/contents/${encodeURIComponent(
                  previous || filename,
                )}?ref=${encodeURIComponent(parentSha)}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'GuruAgent/1.0.0',
                  },
                },
              );
              if (baseResp.ok) {
                const baseData = (await baseResp.json()) as any;
                if (baseData?.encoding === 'base64' && baseData?.content) {
                  oldText = decodeBase64(baseData.content as string);
                }
              }
            }

            if (status !== 'removed') {
              const headResp = await fetch(
                `https://api.github.com/repos/${org}/${repo}/contents/${encodeURIComponent(
                  filename,
                )}?ref=${encodeURIComponent(sha)}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'GuruAgent/1.0.0',
                  },
                },
              );
              if (headResp.ok) {
                const headData = (await headResp.json()) as any;
                if (headData?.encoding === 'base64' && headData?.content) {
                  newText = decodeBase64(headData.content as string);
                }
              }
            }

            const newBytes = Buffer.byteLength(newText, 'utf8');
            const newLines = countLines(newText);

            let snippetText: string;
            let metadata: Record<string, any> = {
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

            const isPackageJson = filename.endsWith('package.json');
            const isLockfile = /(^|\/)yarn\.lock$|(^|\/)package-lock\.json$|(^|\/)pnpm-lock\.yaml$|(^|\/)bun\.lockb$/.test(
              filename,
            );

            // Summarize lockfiles and package.json if configured/large
            if (isPackageJson) {
              const summary = summarizePackageJson(newText);
              if (summary) metadata.packageJsonSummary = summary;
            }

            const exceedsLimits = newLines > maxFileLines || newBytes > maxFileBytes;

            if (exceedsLimits) {
              if (largeFileStrategy === 'exclude') {
                // Skip adding evidence content but keep a stub entry for traceability
                snippetText = '[Content excluded due to size policy]';
              } else if (largeFileStrategy === 'headTail') {
                const clipped = maybeHeadTail(newText, headTailHeadLines, headTailTailLines);
                snippetText = clipped;
              } else {
                // summary
                if (isLockfile && summarizeLockfiles) {
                  metadata.lockfileSummary = summarizeLockfile(newText);
                  snippetText = '[Lockfile summarized — see metadata.lockfileSummary]';
                } else if (isPackageJson) {
                  snippetText = '[package.json summarized — see metadata.packageJsonSummary]';
                } else {
                  snippetText = `[Large file summarized] Lines: ${newLines}, Size: ${newBytes} bytes`;
                }
              }
            } else if (isLockfile && summarizeLockfiles) {
              metadata.lockfileSummary = summarizeLockfile(newText);
              snippetText = '[Lockfile summarized — see metadata.lockfileSummary]';
            } else if (isPackageJson && summarizeLockfiles) {
              // For package.json we already attached summary; avoid dumping full file
              snippetText = '[package.json summarized — see metadata.packageJsonSummary]';
            } else {
              snippetText = status === 'removed' ? oldText : newText;
            }

            const snippet = status === 'removed'
              ? computeUnifiedDiff(oldText, '', filename)
              : computeUnifiedDiff(oldText, snippetText, filename);

            const evId = `${org}/${repo}:${branch}:${sha}:${filename}`;
            evidence.push({
              id: evId,
              sourceType: 'github',
              sourceName: `${org}/${repo} (${branch})`,
              changeType,
              identifier: filename,
              timestamp: commitDate,
              metadata,
              snippet,
            });
          }
        }

        if (commits.length < perPage) break;
        page += 1;
      }
    }
  }

  return evidence;
} 