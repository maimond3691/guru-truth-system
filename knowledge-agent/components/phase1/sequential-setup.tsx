import { useState, useEffect } from 'react';
import { generateUUID } from '@/lib/utils';
import { CrossSmallIcon } from '@/components/icons';

export interface Phase1SequentialSetupProps {
  selectedSources: Array<'github' | 'docs' | 'sheets' | 'guru'>;
  appendAssistantMessage: (text: string) => void;
  onBeforeGenerate?: () => void;
}

export function Phase1SequentialSetup({
  selectedSources,
  appendAssistantMessage,
  onBeforeGenerate,
}: Phase1SequentialSetupProps) {
  // Index of current source to configure
  const [currentIndex, setCurrentIndex] = useState(0);

  // Common
  const [title, setTitle] = useState<string>('Raw Context — {SOURCES} — {SINCE..NOW}');
  const [submitting, setSubmitting] = useState(false);

  // GitHub state
  const [repos, setRepos] = useState<string[]>([]);
  const [useAllRepos, setUseAllRepos] = useState<boolean>(true);
  const [availableRepos, setAvailableRepos] = useState<Array<{ name: string; fullName: string }>>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [branches, setBranches] = useState<string[]>(['main']);
  const [availableBranches, setAvailableBranches] = useState<Array<{ name: string }>>([]);
  
  // GitHub context options
  const [enableDateRange, setEnableDateRange] = useState<boolean>(true);
  const [enableFileSelection, setEnableFileSelection] = useState<boolean>(false);
  const [enableCommitSelection, setEnableCommitSelection] = useState<boolean>(false);
  
  // Date range options
  const [sinceDate, setSinceDate] = useState<string>('');
  
  // File selection options
  const [availableFiles, setAvailableFiles] = useState<Array<{ path: string; type: 'file' | 'dir' }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filePickerRepo, setFilePickerRepo] = useState<string>('');
  const [filePickerBranch, setFilePickerBranch] = useState<string>('main');
  const [currentPath, setCurrentPath] = useState<string>('');
  
  // Commit selection options
  const [availableCommits, setAvailableCommits] = useState<Array<{ sha: string; message: string; author: { name: string; date: string } }>>([]);
  const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
  const [commitPickerRepo, setCommitPickerRepo] = useState<string>('');
  const [commitPickerBranch, setCommitPickerBranch] = useState<string>('main');
  
  // File handling options
  const [maxFileLines, setMaxFileLines] = useState<number>(2000);
  const [maxFileBytes, setMaxFileBytes] = useState<number>(200 * 1024);
  const [largeFileStrategy, setLargeFileStrategy] = useState<'summary' | 'headTail' | 'exclude'>('summary');
  const [headTailHeadLines, setHeadTailHeadLines] = useState<number>(200);
  const [headTailTailLines, setHeadTailTailLines] = useState<number>(50);
  const [summarizeLockfiles, setSummarizeLockfiles] = useState<boolean>(true);

  // Google state
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [googleIsLoading, setGoogleIsLoading] = useState<boolean>(true);
  const [googleSelected, setGoogleSelected] = useState<Array<{ id: string; name: string; mimeType: string }>>([]);

  // Guru state
  const [guruQuery, setGuruQuery] = useState<string>('');
  const [guruSearching, setGuruSearching] = useState<boolean>(false);
  const [guruResults, setGuruResults] = useState<Array<{ id: string; title: string }>>([]);
  const [guruSelected, setGuruSelected] = useState<Array<{ id: string; title: string }>>([]);

  // Persisted configs (per source)
  const [githubConfig, setGithubConfig] = useState<null | {
    org: string;
    repos: string[];
    branches: string[];
    contextOptions: Array<{
      mode: 'date-range';
      sinceDate: string;
    } | {
      mode: 'file-selection';
      selectedPaths: string[];
    } | {
      mode: 'commit-selection';
      selectedCommits: string[];
    }>;
    maxFileLines?: number;
    maxFileBytes?: number;
    largeFileStrategy?: 'summary' | 'headTail' | 'exclude';
    summarizeLockfiles?: boolean;
    headTailHeadLines?: number;
    headTailTailLines?: number;
  }>(null);
  const [googleConfig, setGoogleConfig] = useState<null | { files: Array<{ id: string; name: string; mimeType: string }> }>(null);
  const [guruConfig, setGuruConfig] = useState<null | { cards: Array<{ id: string; title?: string }> }>(null);

  const currentSource = selectedSources[currentIndex];
  const isLast = currentIndex === selectedSources.length - 1;

  // Load GitHub repos when needed
  useEffect(() => {
    if (currentSource !== 'github') return;
    (async () => {
      try {
        const resp = await fetch('/api/github/repos');
        if (!resp.ok) return;
        const data = await resp.json();
        setAvailableRepos(data.repos.map((r: any) => ({ name: r.name, fullName: r.fullName })));
      } catch {}
    })();
  }, [currentSource]);

  // Load branches when a repo is picked
  useEffect(() => {
    if (currentSource !== 'github') return;
    (async () => {
      if (!selectedRepo) {
        setAvailableBranches([]);
        return;
      }
      try {
        const resp = await fetch(`/api/github/branches?repo=${encodeURIComponent(selectedRepo)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setAvailableBranches(data.branches.map((b: any) => ({ name: b.name })));
      } catch {}
    })();
  }, [currentSource, selectedRepo]);

  // Load Google connection status when needed
  useEffect(() => {
    if (!(currentSource === 'docs' || currentSource === 'sheets')) return;
    (async () => {
      setGoogleIsLoading(true);
      try {
        // Only query status if redirect URI is configured; otherwise treat as disconnected
        if (!process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI) {
          setGoogleConnected(false);
        } else {
          const resp = await fetch('/api/google/oauth?action=status');
          const data = await resp.json();
          setGoogleConnected(!!data.connected);
        }
      } catch {}
      setGoogleIsLoading(false);
    })();
  }, [currentSource]);

  // Load files when file picker repo/branch changes
  useEffect(() => {
    if (currentSource !== 'github' || !enableFileSelection || !filePickerRepo) return;
    (async () => {
      try {
        const resp = await fetch(`/api/github/files?repo=${encodeURIComponent(filePickerRepo)}&branch=${encodeURIComponent(filePickerBranch)}&path=${encodeURIComponent(currentPath)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setAvailableFiles(data.files || []);
      } catch {}
    })();
  }, [currentSource, enableFileSelection, filePickerRepo, filePickerBranch, currentPath]);

  // Load commits when commit picker repo/branch changes
  useEffect(() => {
    if (currentSource !== 'github' || !enableCommitSelection || !commitPickerRepo) return;
    (async () => {
      try {
        const resp = await fetch(`/api/github/commits?repo=${encodeURIComponent(commitPickerRepo)}&branch=${encodeURIComponent(commitPickerBranch)}&limit=50`);
        if (!resp.ok) return;
        const data = await resp.json();
        setAvailableCommits(data.commits || []);
      } catch {}
    })();
  }, [currentSource, enableCommitSelection, commitPickerRepo, commitPickerBranch]);

  function toggleRepo(name: string) {
    setRepos((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  }

  function toggleBranch(name: string) {
    setBranches((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  }

  function toggleFile(path: string) {
    setSelectedFiles((prev) => (prev.includes(path) ? prev.filter((f) => f !== path) : [...prev, path]));
  }

  function toggleCommit(sha: string) {
    setSelectedCommits((prev) => (prev.includes(sha) ? prev.filter((c) => c !== sha) : [...prev, sha]));
  }

  function navigateToPath(path: string) {
    setCurrentPath(path);
  }

  const openGooglePicker = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
      if (!apiKey || !redirectUri) {
        alert('Google Picker requires NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_REDIRECT_URI');
        return;
      }

      // Fetch an access token for the current user
      const tokenResp = await fetch('/api/google/access-token');
      if (!tokenResp.ok) throw new Error('Unable to get Google access token');
      const { accessToken } = await tokenResp.json();

      // Load Google APIs if not already present
      await new Promise<void>((resolve, reject) => {
        if ((window as any).gapi?.load && (window as any).google?.picker) return resolve();
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google API'));
        document.head.appendChild(script);
      });

      // Load the picker module via gapi
      await new Promise<void>((resolve, reject) => {
        const gapi = (window as any).gapi;
        if (!gapi?.load) return reject(new Error('Google API client not available'));
        gapi.load('picker', { callback: resolve });
      });

      const googleNS = (window as any).google;
      if (!googleNS?.picker) throw new Error('Google Picker not available');

      const viewDocs = new googleNS.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet');

      const picker = new googleNS.picker.PickerBuilder()
        .enableFeature(googleNS.picker.Feature.NAV_HIDDEN)
        .enableFeature(googleNS.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .addView(viewDocs)
        .setCallback((data: any) => {
          if (data.action === googleNS.picker.Action.PICKED) {
            const picked = (data.docs || []).map((d: any) => ({
              id: d.id,
              name: d.name,
              mimeType: d.mimeType,
            }));
            setGoogleSelected(picked);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to open Google Picker');
    }
  };

  const connectGoogle = async () => {
    const resp = await fetch('/api/google/oauth?action=start');
    if (!resp.ok) return;
    const data = await resp.json();
    window.location.href = data.authUrl;
  };

  const searchGuru = async () => {
    setGuruSearching(true);
    try {
      const params = new URLSearchParams();
      if (guruQuery) params.set('q', guruQuery);
      params.set('max', '20');
      const resp = await fetch(`/api/guru/search?${params.toString()}`);
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setGuruResults((data.cards || data.results || data.results?.cards || data.cards || []).map((c: any) => ({ id: c.id, title: c.title })));
    } catch (e: any) {
      alert(e?.message || 'Guru search failed');
    } finally {
      setGuruSearching(false);
    }
  };

  const handleSaveAndNext = async () => {
    // Validate and persist current source config locally
    if (currentSource === 'github') {
      // Build context options based on enabled modes
      const contextOptions: Array<any> = [];
      
      if (enableDateRange) {
        if (!sinceDate) {
          alert('Please enter a since date (YYYY-MM-DD) for date range mode');
          return;
        }
        contextOptions.push({ mode: 'date-range', sinceDate });
      }
      
      if (enableFileSelection) {
        if (selectedFiles.length === 0) {
          alert('Please select at least one file or directory for file selection mode');
          return;
        }
        contextOptions.push({ mode: 'file-selection', selectedPaths: selectedFiles });
      }
      
      if (enableCommitSelection) {
        if (selectedCommits.length === 0) {
          alert('Please select at least one commit for commit selection mode');
          return;
        }
        contextOptions.push({ mode: 'commit-selection', selectedCommits });
      }
      
      if (contextOptions.length === 0) {
        alert('Please enable at least one context mode (Date Range, File Selection, or Commit Selection)');
        return;
      }
      
      setGithubConfig({ 
        org: 'peak-watch', 
        repos: useAllRepos ? ['*'] : repos, 
        branches: branches.length ? branches : ['main'], 
        contextOptions,
        maxFileLines, 
        maxFileBytes, 
        largeFileStrategy, 
        summarizeLockfiles, 
        headTailHeadLines, 
        headTailTailLines 
      });
    } else if (currentSource === 'docs' || currentSource === 'sheets') {
      if (!googleConnected) {
        alert('Please connect Google before proceeding');
        return;
      }
      if (googleSelected.length === 0) {
        alert('Please select at least one Google file');
        return;
      }
      setGoogleConfig({ files: googleSelected });
    } else if (currentSource === 'guru') {
      if (guruSelected.length === 0) {
        alert('Please select at least one Guru card');
        return;
      }
      setGuruConfig({ cards: guruSelected });
    }

    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      return;
    }

    // Last source configured → run ingestion
    onBeforeGenerate?.();
    setSubmitting(true);
    try {
      const documentId = generateUUID();
      const chosenSources: any[] = [];
      const sourcesLabel: string[] = [];

      if (githubConfig || currentSource === 'github') {
        // Use latest entered GitHub config
        let conf = githubConfig;
        if (!conf) {
          // Build fallback config from current state
          const contextOptions: Array<any> = [];
          if (enableDateRange && sinceDate) {
            contextOptions.push({ mode: 'date-range', sinceDate });
          }
          if (enableFileSelection && selectedFiles.length > 0) {
            contextOptions.push({ mode: 'file-selection', selectedPaths: selectedFiles });
          }
          if (enableCommitSelection && selectedCommits.length > 0) {
            contextOptions.push({ mode: 'commit-selection', selectedCommits });
          }
          conf = { 
            org: 'peak-watch', 
            repos: useAllRepos ? ['*'] : repos, 
            branches: branches.length ? branches : ['main'], 
            contextOptions: contextOptions.length > 0 ? contextOptions : [{ mode: 'date-range', sinceDate }],
            maxFileLines, 
            maxFileBytes, 
            largeFileStrategy, 
            summarizeLockfiles, 
            headTailHeadLines, 
            headTailTailLines 
          };
        }
        chosenSources.push({ type: 'github', ...conf });
        sourcesLabel.push('Github');
      }

      if (googleConfig || currentSource === 'docs' || currentSource === 'sheets') {
        const conf = googleConfig ?? { files: googleSelected };
        chosenSources.push({ type: 'google', ...conf });
        sourcesLabel.push('Google');
      }

      if (guruConfig || currentSource === 'guru') {
        const conf = guruConfig ?? { cards: guruSelected };
        chosenSources.push({ type: 'guru', ...conf });
        sourcesLabel.push('Guru');
      }

      const computedTitle = title
        .replace('{SOURCES}', sourcesLabel.filter((v, i, a) => a.indexOf(v) === i).join(' + '))
        .replace('{SINCE..NOW}', sinceDate ? `${sinceDate}..${new Date().toISOString().split('T')[0]}` : '');

      const payload = {
        documentId,
        title: computedTitle,
        params: { sources: chosenSources },
      };

      const resp = await fetch('/api/phase1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const { download, summary } = await resp.json();
      const url = `/api/phase1/download?id=${encodeURIComponent(download.documentId)}&fileName=${encodeURIComponent(download.fileName)}`;
      appendAssistantMessage(`Summary: ${summary}\n\n[Download ${download.fileName}](${url})`);
    } catch (e: any) {
      alert(e?.message || 'Failed to start Phase 1');
    } finally {
      setSubmitting(false);
    }
  };

  const label = selectedSources
    .map((s) => (s === 'github' ? 'GitHub' : s === 'guru' ? 'Guru' : 'Google'))
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(' + ');

  return (
    <div className="border rounded-xl p-4 bg-zinc-50 dark:bg-zinc-900/40">
      <div className="font-semibold mb-2">Phase 1 — Setup ({label})</div>

      <div className="flex flex-col gap-3">
        <input
          className="px-3 py-2 rounded-md bg-background border"
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {currentSource === 'github' && (
          <div className="flex flex-col gap-3">
    
            {/* Context Mode Selection */}
            <div className="flex flex-col gap-3 p-3 border rounded-md">
              <div className="text-sm font-medium">GitHub Context Options</div>
              <div className="text-xs text-zinc-500">Select one or more context modes to combine:</div>
              
              {/* Date Range Mode */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={enableDateRange} 
                    onChange={(e) => setEnableDateRange(e.target.checked)} 
                  />
                  <span className="font-medium">Date Range (all changes since a date)</span>
                </label>
                {enableDateRange && (
                  <input
                    className="px-3 py-2 rounded-md bg-background border ml-6"
                    placeholder="Since date (YYYY-MM-DD)"
                    value={sinceDate}
                    onChange={(e) => setSinceDate(e.target.value)}
                  />
                )}
              </div>

              {/* File Selection Mode */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={enableFileSelection} 
                    onChange={(e) => setEnableFileSelection(e.target.checked)} 
                  />
                  <span className="font-medium">File Selection (specific files/directories)</span>
                </label>
                {enableFileSelection && (
                  <div className="ml-6 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="px-2 py-1 rounded-md bg-background border"
                        value={filePickerRepo}
                        onChange={(e) => setFilePickerRepo(e.target.value)}
                      >
                        <option value="">Select repo for file picker</option>
                        {availableRepos.map((repo) => (
                          <option key={repo.name} value={repo.name}>
                            {repo.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="px-2 py-1 rounded-md bg-background border"
                        value={filePickerBranch}
                        onChange={(e) => setFilePickerBranch(e.target.value)}
                        disabled={!filePickerRepo}
                      >
                        <option value="main">main</option>
                        {availableBranches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {filePickerRepo && (
                      <div className="flex flex-col gap-2">
                        {currentPath && (
                          <div className="flex items-center gap-2 text-sm">
                            <span>Path: {currentPath}</span>
                            <button
                              type="button"
                              className="text-blue-500 hover:underline text-xs"
                              onClick={() => setCurrentPath('')}
                            >
                              ← Back to root
                            </button>
                          </div>
                        )}
                        
                        <div className="max-h-32 overflow-auto border rounded p-2">
                          {availableFiles.map((file) => (
                            <div key={file.path} className="flex items-center gap-2 py-1">
                              {file.type === 'dir' ? (
                                <button
                                  type="button"
                                  className="text-blue-500 hover:underline text-left flex-1"
                                  onClick={() => navigateToPath(file.path)}
                                >
                                  📁 {file.path.split('/').pop()}/
                                </button>
                              ) : (
                                <label className="flex items-center gap-2 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.path)}
                                    onChange={() => toggleFile(file.path)}
                                  />
                                  <span>📄 {file.path.split('/').pop()}</span>
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {selectedFiles.length > 0 && (
                          <div className="text-sm text-zinc-500">
                            Selected {selectedFiles.length} file(s): {selectedFiles.slice(0, 3).join(', ')}{selectedFiles.length > 3 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Commit Selection Mode */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={enableCommitSelection} 
                    onChange={(e) => setEnableCommitSelection(e.target.checked)} 
                  />
                  <span className="font-medium">Commit Selection (specific commits)</span>
                </label>
                {enableCommitSelection && (
                  <div className="ml-6 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="px-2 py-1 rounded-md bg-background border"
                        value={commitPickerRepo}
                        onChange={(e) => setCommitPickerRepo(e.target.value)}
                      >
                        <option value="">Select repo for commit picker</option>
                        {availableRepos.map((repo) => (
                          <option key={repo.name} value={repo.name}>
                            {repo.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="px-2 py-1 rounded-md bg-background border"
                        value={commitPickerBranch}
                        onChange={(e) => setCommitPickerBranch(e.target.value)}
                        disabled={!commitPickerRepo}
                      >
                        <option value="main">main</option>
                        {availableBranches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {commitPickerRepo && (
                      <div className="flex flex-col gap-2">
                        <div className="max-h-40 overflow-auto border rounded">
                          {availableCommits.map((commit) => (
                            <label key={commit.sha} className="flex items-start gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                              <input
                                type="checkbox"
                                checked={selectedCommits.includes(commit.sha)}
                                onChange={() => toggleCommit(commit.sha)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-mono text-zinc-500">{commit.sha.substring(0, 7)}</div>
                                <div className="text-sm truncate">{commit.message}</div>
                                <div className="text-xs text-zinc-400">
                                  {commit.author.name} • {new Date(commit.author.date).toLocaleDateString()}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                        
                        {selectedCommits.length > 0 && (
                          <div className="text-sm text-zinc-500">
                            Selected {selectedCommits.length} commit(s)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3 border rounded-md">
              <div className="text-sm font-medium">Large file handling</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">Max lines</span>
                  <input type="number" className="px-2 py-1 rounded-md bg-background border w-28" value={maxFileLines} onChange={(e) => setMaxFileLines(Number(e.target.value) || 0)} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">Max bytes</span>
                  <input type="number" className="px-2 py-1 rounded-md bg-background border w-28" value={maxFileBytes} onChange={(e) => setMaxFileBytes(Number(e.target.value) || 0)} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">Strategy</span>
                  <select className="px-2 py-1 rounded-md bg-background border" value={largeFileStrategy} onChange={(e) => setLargeFileStrategy(e.target.value as any)}>
                    <option value="summary">Summarize</option>
                    <option value="headTail">Head/Tail</option>
                    <option value="exclude">Exclude</option>
                  </select>
                </label>
              </div>
              {largeFileStrategy === 'headTail' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">Head lines</span>
                    <input type="number" className="px-2 py-1 rounded-md bg-background border w-28" value={headTailHeadLines} onChange={(e) => setHeadTailHeadLines(Number(e.target.value) || 0)} />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">Tail lines</span>
                    <input type="number" className="px-2 py-1 rounded-md bg-background border w-28" value={headTailTailLines} onChange={(e) => setHeadTailTailLines(Number(e.target.value) || 0)} />
                  </label>
                </div>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={summarizeLockfiles} onChange={(e) => setSummarizeLockfiles(e.target.checked)} />
                <span>Summarize lockfiles/package.json rather than include full content</span>
              </label>
            </div>
          </div>
        )}

        {(currentSource === 'docs' || currentSource === 'sheets') && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Google</div>
            {googleIsLoading ? (
              <div>Loading Google status…</div>
            ) : !googleConnected ? (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-zinc-500">Connect your Google account to continue.</div>
                <button
                  className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  onClick={connectGoogle}
                  type="button"
                >
                  Connect Google
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  onClick={openGooglePicker}
                  type="button"
                >
                  Select files
                </button>
                <span className="text-sm text-zinc-500">Selected: {googleSelected.length}</span>
              </div>
            )}
            {googleSelected.length > 0 && (
              <ul className="text-sm list-disc ml-5">
                {googleSelected.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2">
                    <span>
                      {f.name} <span className="text-zinc-500">({f.id})</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      onClick={() =>
                        setGoogleSelected((prev) => prev.filter((x) => x.id !== f.id))
                      }
                    >
                      <CrossSmallIcon size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {currentSource === 'guru' && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Guru</div>
            <div className="flex items-center gap-2">
              <input
                className="px-3 py-2 rounded-md bg-background border flex-1"
                placeholder="Search cards (title/content)…"
                value={guruQuery}
                onChange={(e) => setGuruQuery(e.target.value)}
              />
              <button
                className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                onClick={searchGuru}
                type="button"
                disabled={guruSearching}
              >
                {guruSearching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {guruResults.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-zinc-500">Results:</div>
                <ul className="max-h-48 overflow-auto divide-y rounded border">
                  {guruResults.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate">{c.title}</span>
                      <button
                        type="button"
                        className="px-2 py-1 text-sm rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        onClick={() =>
                          setGuruSelected((prev) => (prev.find((x) => x.id === c.id) ? prev : [...prev, c]))
                        }
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {guruSelected.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-zinc-500">Selected cards:</div>
                <ul className="text-sm list-disc ml-5">
                  {guruSelected.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span>
                        {c.title} <span className="text-zinc-500">({c.id})</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${c.title}`}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => setGuruSelected((prev) => prev.filter((x) => x.id !== c.id))}
                      >
                        <CrossSmallIcon size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            onClick={handleSaveAndNext}
            disabled={submitting}
            type="button"
          >
            {isLast ? (submitting ? 'Submitting…' : 'Generate Raw Context') : 'Save & Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
