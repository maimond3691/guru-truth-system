'use client';

import { GitBranch, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LanguageBadge, RepoPrivateBadge, formatRelativeTime } from './shared';

interface Repository {
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  cloneUrl: string;
}

interface GitHubRepoListProps {
  repos: Repository[];
}

export function GitHubRepoList({ repos }: GitHubRepoListProps) {
  if (!repos?.length) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No repositories found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <GitBranch size={16} />
        <span>{repos.length} repositories</span>
      </div>
      
      {repos.map((repo) => (
        <Card key={repo.name} className="transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <a
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  {repo.name}
                  <ExternalLink size={12} />
                </a>
                <RepoPrivateBadge isPrivate={repo.private} />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {repo.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {repo.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <LanguageBadge language={repo.language} />
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <GitBranch size={12} />
                  <span>{repo.defaultBranch}</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Updated {formatRelativeTime(repo.updatedAt)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}