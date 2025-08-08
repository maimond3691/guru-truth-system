import { GitBranch, File, Folder, ExternalLink } from 'lucide-react';
import { formatDistance } from 'date-fns';

// Language colors from GitHub's linguist
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Java: '#b07219',
  Go: '#00add8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  HTML: '#e34c26',
  CSS: '#563d7c',
  PHP: '#4f5d95',
  Ruby: '#701516',
  Swift: '#fa7343',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  Markdown: '#083fa1',
};

interface LanguageBadgeProps {
  language: string | null;
}

export function LanguageBadge({ language }: LanguageBadgeProps) {
  if (!language) return null;
  
  const color = LANGUAGE_COLORS[language] || '#6b7280';
  
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-muted-foreground">{language}</span>
    </div>
  );
}

interface FileIconProps {
  name: string;
  type: 'file' | 'dir';
}

export function GitHubFileIcon({ name, type }: FileIconProps) {
  if (type === 'dir') {
    return <Folder size={16} className="text-blue-500" />;
  }
  
  return <File size={16} className="text-muted-foreground" />;
}

interface UserAvatarProps {
  user: {
    login?: string;
    avatarUrl?: string;
    htmlUrl?: string;
  } | null;
  size?: number;
}

export function UserAvatar({ user, size = 20 }: UserAvatarProps) {
  if (!user?.avatarUrl) return null;
  
  return (
    <img
      src={user.avatarUrl}
      alt={user.login || 'User'}
      className={`rounded-full`}
      style={{ width: size, height: size }}
    />
  );
}

interface RepoPrivateBadgeProps {
  isPrivate: boolean;
}

export function RepoPrivateBadge({ isPrivate }: RepoPrivateBadgeProps) {
  if (!isPrivate) return null;
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
      Private
    </span>
  );
}

export function formatRelativeTime(dateString: string): string {
  return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}