'use client';

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { generateUUID } from '@/lib/utils';
import { CrossSmallIcon } from '@/components/icons';

export interface Phase1SetupProps {
  selectedSources: Array<'github' | 'docs' | 'sheets' | 'guru'>;
  appendAssistantMessage: (text: string) => void;
  onBeforeGenerate?: () => void;
}

export function Phase1Setup({
  selectedSources,
  appendAssistantMessage,
  onBeforeGenerate,
}: Phase1SetupProps) {
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

  // This component needs to be extracted with all the complex logic from messages.tsx
  // For now, this is a placeholder structure showing the interface
  
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold">Phase 1 Setup</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Configure your data sources for generating raw context.
      </p>
      
      {/* TODO: Move the massive Phase1SequentialSetup logic here */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Sources Selected:</label>
          <div className="flex gap-2">
            {selectedSources.map(source => (
              <span 
                key={source}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md"
          />
        </div>
        
        <button
          className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={() => {
            // TODO: Implement the actual phase 1 generation logic
            appendAssistantMessage('Phase 1 setup complete! (Implementation pending)');
          }}
          disabled={submitting}
          type="button"
        >
          {submitting ? 'Generating...' : 'Generate Raw Context'}
        </button>
      </div>
    </div>
  );
}

export default memo(Phase1Setup);
