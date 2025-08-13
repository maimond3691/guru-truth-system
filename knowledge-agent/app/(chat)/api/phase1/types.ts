export type SourceType = 'github' | 'google' | 'guru';

export type EvidenceChangeType = 'added' | 'modified' | 'deleted' | 'renamed' | 'other';

export interface EvidenceItem {
  id: string; // stable EVIDENCE_ID
  sourceType: SourceType; // 'github'
  sourceName: string; // e.g., peak-watch/repo (branch)
  changeType: EvidenceChangeType;
  identifier: string; // file path
  timestamp: string; // ISO
  metadata: Record<string, any>;
  snippet: string | null; // full diff or content
}

export type GithubContextMode = 'date-range' | 'file-selection' | 'commit-selection';

export interface GithubDateRangeParams {
  mode: 'date-range';
  sinceDate: string; // YYYY-MM-DD
}

export interface GithubFileSelectionParams {
  mode: 'file-selection';
  selectedPaths: string[]; // array of file/directory paths
}

export interface GithubCommitSelectionParams {
  mode: 'commit-selection';
  selectedCommits: string[]; // array of commit SHAs
}

export type GithubContextParams = GithubDateRangeParams | GithubFileSelectionParams | GithubCommitSelectionParams;

export interface GithubSourceParams {
  type: 'github';
  org: string; // 'peak-watch'
  repos: string[];
  branches: string[];
  contextOptions: GithubContextParams[]; // can combine multiple context options
  // Large-file handling
  maxFileLines?: number; // if exceeded, apply largeFileStrategy
  maxFileBytes?: number; // if exceeded, apply largeFileStrategy
  largeFileStrategy?: 'summary' | 'headTail' | 'exclude';
  summarizeLockfiles?: boolean; // summarize lockfiles instead of full content
  headTailHeadLines?: number; // lines to include from start when using headTail
  headTailTailLines?: number; // lines to include from end when using headTail
}

export interface GoogleSourceParams {
  type: 'google';
  files: Array<{ id: string; mimeType: string; name: string }>; // selected file list
}

export interface GuruSourceParams {
  type: 'guru';
  cards: Array<{ id: string; title?: string }>; // selected card list
}

export interface Phase1Params {
  sources: Array<GithubSourceParams | GoogleSourceParams | GuruSourceParams>;
}

export interface Phase1FrontmatterState {
  phaseState: {
    phase: 'phase-1';
    status: 'in_progress' | 'awaiting_approval' | 'complete' | 'error';
    params: Phase1Params;
    artifacts: Array<{
      id: string;
      kind: 'text';
      title: string;
      github?: {
        repo: string;
        branch: string;
        path: string;
      };
    }>;
    lastUpdatedAt: string; // ISO
    runInfo?: {
      runId?: string;
      appVersion?: string;
    };
  };
} 