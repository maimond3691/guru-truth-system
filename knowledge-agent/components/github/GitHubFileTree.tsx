'use client';

import { Folder, File, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GitHubFileIcon, formatFileSize } from './shared';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
  downloadUrl?: string;
  htmlUrl: string;
}

interface DirectoryListing {
  path: string;
  type: 'directory';
  items: FileItem[];
}

interface SingleFile {
  name: string;
  path: string;
  type: 'file';
  size: number;
  sha: string;
  encoding?: string;
  downloadUrl?: string;
  htmlUrl: string;
  content?: string;
}

export type GitHubFileTreeData = DirectoryListing | SingleFile;

interface GitHubFileTreeProps {
  data: GitHubFileTreeData;
}

export function GitHubFileTree({ data }: GitHubFileTreeProps) {
  if (data.type === 'file') {
    // Single file view
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitHubFileIcon name={data.name} type="file" />
              <span className="font-medium">{data.name}</span>
            </div>
            <a
              href={data.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatFileSize(data.size)}</span>
            {data.encoding && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                {data.encoding}
              </span>
            )}
          </div>
          
          {data.content && (
            <div className="mt-3 text-sm text-muted-foreground">
              Content available (use read-file tool to get decoded content)
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Directory listing view
  const { items, path } = data;
  const directories = items.filter(item => item.type === 'dir');
  const files = items.filter(item => item.type === 'file');

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Folder size={20} className="text-blue-500" />
          <span className="font-medium">
            {path === '/' ? 'Repository root' : path}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ml-auto">
            {items.length} items
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="divide-y">
          {/* Directories first */}
          {directories.map((item) => (
            <div
              key={item.path}
              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GitHubFileIcon name={item.name} type={item.type} />
                <span className="font-medium">{item.name}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                  DIR
                </span>
              </div>
              
              <a
                href={item.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          ))}
          
          {/* Files */}
          {files.map((item) => (
            <div
              key={item.path}
              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GitHubFileIcon name={item.name} type={item.type} />
                <span className="font-medium truncate">{item.name}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(item.size)}
                </span>
                <a
                  href={item.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
        
        {items.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            This directory is empty
          </div>
        )}
      </CardContent>
    </Card>
  );
}