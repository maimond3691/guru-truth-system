'use client';

import { GitCommit, ExternalLink, Shield, ShieldCheck, MessageCircle, Calendar, User, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UserAvatar, formatRelativeTime } from './shared';

interface CommitAuthor {
  name: string | null;
  email: string | null;
  date: string | null;
  githubUser: {
    login: string;
    id: number;
    avatarUrl: string;
    htmlUrl: string;
  } | null;
}

interface CommitVerification {
  verified: boolean;
  reason: string;
  signature: string | null;
  verifiedAt: string | null;
}

interface CommitParent {
  sha: string;
  shortSha: string;
  url: string;
}

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  author: CommitAuthor;
  committer: CommitAuthor;
  urls: {
    commit: string;
    api: string;
    comments: string;
  };
  stats: {
    commentCount: number;
  };
  verification: CommitVerification | null;
  parents: CommitParent[];
}

interface CommitHistoryData {
  repository: string;
  branch: string;
  filters: {
    path: string | null;
    author: string | null;
    committer: string | null;
    since: string | null;
    until: string | null;
  };
  totalReturned: number;
  maxResults: number;
  commits: Commit[];
}

interface GitHubCommitHistoryProps {
  data: CommitHistoryData;
}

export function GitHubCommitHistory({ data }: GitHubCommitHistoryProps) {
  const { repository, branch, filters, totalReturned, commits } = data;

  return (
    <div className="w-full max-w-4xl space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit size={20} className="text-muted-foreground" />
              <div>
                <div className="font-semibold">{repository}</div>
                <div className="text-sm text-muted-foreground">
                  {branch === 'default branch' ? 'Default branch' : `Branch: ${branch}`}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {totalReturned} commit{totalReturned !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Active Filters */}
          {(filters.path || filters.author || filters.committer || filters.since || filters.until) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.path && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Path: {filters.path}
                </span>
              )}
              {filters.author && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Author: {filters.author}
                </span>
              )}
              {filters.committer && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Committer: {filters.committer}
                </span>
              )}
              {filters.since && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  Since: {new Date(filters.since).toLocaleDateString()}
                </span>
              )}
              {filters.until && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  Until: {new Date(filters.until).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Commits List */}
      <div className="space-y-3">
        {commits.map((commit, index) => (
          <Card key={commit.sha} className="transition-colors hover:bg-muted/30">
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {commit.author.githubUser?.avatarUrl ? (
                    <UserAvatar user={commit.author.githubUser} size={32} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Commit Content */}
                <div className="flex-1 min-w-0">
                  {/* Commit Message */}
                  <div className="font-medium text-sm mb-1">
                    {commit.message.split('\n')[0]}
                  </div>
                  
                  {/* Extended Message */}
                  {commit.message.includes('\n') && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {commit.message.split('\n').slice(1).join('\n').trim()}
                    </div>
                  )}

                  {/* Commit Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {/* Author */}
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      {commit.author.githubUser ? (
                        <a
                          href={commit.author.githubUser.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          {commit.author.githubUser.login}
                        </a>
                      ) : (
                        <span>{commit.author.name || commit.author.email}</span>
                      )}
                    </div>

                    {/* Date */}
                    {commit.author.date && (
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{formatRelativeTime(commit.author.date)}</span>
                      </div>
                    )}

                    {/* SHA */}
                    <div className="flex items-center gap-1">
                      <Hash size={12} />
                      <span className="font-mono">{commit.shortSha}</span>
                    </div>

                    {/* Verification */}
                    {commit.verification && (
                      <div className="flex items-center gap-1">
                        {commit.verification.verified ? (
                          <ShieldCheck size={12} className="text-green-600" />
                        ) : (
                          <Shield size={12} className="text-yellow-600" />
                        )}
                        <span className={commit.verification.verified ? 'text-green-600' : 'text-yellow-600'}>
                          {commit.verification.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    )}

                    {/* Comment Count */}
                    {commit.stats.commentCount > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle size={12} />
                        <span>{commit.stats.commentCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Parents */}
                  {commit.parents.length > 1 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>Merge commit with {commit.parents.length} parents</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  <a
                    href={commit.urls.commit}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="View commit on GitHub"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      {commits.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No commits found with the specified criteria
          </CardContent>
        </Card>
      )}
    </div>
  );
}