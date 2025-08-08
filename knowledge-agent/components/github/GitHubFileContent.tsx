'use client';

import { File, ExternalLink, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFileSize } from './shared';
import { useState } from 'react';

interface GitHubFileContentProps {
  file: {
    name: string;
    path: string;
    size: number;
    sha: string;
    encoding?: string;
    content: string | null;
    downloadUrl?: string;
    htmlUrl: string;
    lastModified?: string;
  };
}

export function GitHubFileContent({ file }: GitHubFileContentProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    if (file.content && file.content !== '[Binary file - content cannot be displayed as text]') {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isBinaryFile = file.content === '[Binary file - content cannot be displayed as text]';
  const isEmpty = !file.content || file.content.trim().length === 0;
  
  // Determine file language based on extension for syntax highlighting
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'sh': 'bash',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
    };
    return languageMap[ext || ''] || 'text';
  };

  const language = getLanguageFromFilename(file.name);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <File size={20} />
            <span className="font-medium">{file.name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium">
              {language}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {file.content && !isBinaryFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                <Copy size={12} />
                <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            )}
            
            <a
              href={file.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          {file.encoding && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
              {file.encoding}
            </span>
          )}
          <span className="text-xs">SHA: {file.sha.substring(0, 7)}</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isBinaryFile ? (
          <div className="p-6 text-center">
            <div className="text-muted-foreground mb-3">
              This is a binary file and cannot be displayed as text.
            </div>
            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
              >
                Download file
              </a>
            )}
          </div>
        ) : isEmpty ? (
          <div className="p-6 text-center text-muted-foreground">
            This file is empty
          </div>
        ) : (
          <div className="border-t">
            <pre className="p-4 text-sm overflow-x-auto bg-muted/30 max-h-96">
              <code className={`language-${language}`}>
                {file.content}
              </code>
            </pre>
            
            {file.content && file.content.split('\n').length > 20 && (
              <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground border-t">
                {file.content.split('\n').length} lines • Truncated for display
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}