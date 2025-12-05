import { useState, useCallback } from 'react';
import { GitHubConfig, PullRequest } from '@/types/codeReview';
import { toast } from '@/hooks/use-toast';

interface UseGitHubReturn {
  config: GitHubConfig | null;
  setConfig: (config: GitHubConfig) => void;
  pullRequests: PullRequest[];
  isLoading: boolean;
  error: string | null;
  fetchPullRequests: () => Promise<void>;
  fetchPullRequest: (prNumber: number) => Promise<PullRequest | null>;
  fetchPRFiles: (prNumber: number) => Promise<PRFile[]>;
  testConnection: () => Promise<boolean>;
}

interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export function useGitHub(): UseGitHubReturn {
  const [config, setConfigState] = useState<GitHubConfig | null>(() => {
    const saved = localStorage.getItem('github_config');
    return saved ? JSON.parse(saved) : null;
  });
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setConfig = useCallback((newConfig: GitHubConfig) => {
    setConfigState(newConfig);
    localStorage.setItem('github_config', JSON.stringify(newConfig));
  }, []);

  const githubFetch = useCallback(async (endpoint: string) => {
    if (!config) throw new Error('GitHub not configured');
    
    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }, [config]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!config) return false;
    
    try {
      setIsLoading(true);
      await githubFetch(`/repos/${config.owner}/${config.repo}`);
      toast({
        title: "Connection Successful",
        description: `Connected to ${config.owner}/${config.repo}`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      toast({
        title: "Connection Failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config, githubFetch]);

  const fetchPullRequests = useCallback(async () => {
    if (!config) return;

    try {
      setIsLoading(true);
      setError(null);

      // First, get list of PRs
      const data = await githubFetch(`/repos/${config.owner}/${config.repo}/pulls?state=all&per_page=20`);
      
      // Fetch detailed info for each PR to get accurate file counts
      const detailedPRs = await Promise.all(
        data.slice(0, 20).map(async (pr: any) => {
          try {
            // Fetch individual PR details which includes additions/deletions/changed_files
            const detail = await githubFetch(`/repos/${config.owner}/${config.repo}/pulls/${pr.number}`);
            return {
              id: detail.id,
              number: detail.number,
              title: detail.title,
              body: detail.body,
              state: detail.merged_at ? 'merged' : detail.state,
              author: detail.user.login,
              authorAvatar: detail.user.avatar_url,
              createdAt: detail.created_at,
              updatedAt: detail.updated_at,
              head: {
                ref: detail.head.ref,
                sha: detail.head.sha,
              },
              base: {
                ref: detail.base.ref,
              },
              additions: detail.additions || 0,
              deletions: detail.deletions || 0,
              changedFiles: detail.changed_files || 0,
              labels: detail.labels?.map((l: any) => l.name) || [],
              reviewState: 'pending' as const,
            };
          } catch {
            // Fallback to basic info if detail fetch fails
            return {
              id: pr.id,
              number: pr.number,
              title: pr.title,
              body: pr.body,
              state: pr.merged_at ? 'merged' : pr.state,
              author: pr.user.login,
              authorAvatar: pr.user.avatar_url,
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
              head: {
                ref: pr.head.ref,
                sha: pr.head.sha,
              },
              base: {
                ref: pr.base.ref,
              },
              additions: 0,
              deletions: 0,
              changedFiles: 0,
              labels: pr.labels?.map((l: any) => l.name) || [],
              reviewState: 'pending' as const,
            };
          }
        })
      );

      setPullRequests(detailedPRs);
      toast({
        title: "PRs Loaded",
        description: `Fetched ${detailedPRs.length} pull requests with details`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pull requests';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [config, githubFetch]);

  const fetchPullRequest = useCallback(async (prNumber: number): Promise<PullRequest | null> => {
    if (!config) return null;

    try {
      setIsLoading(true);
      const pr = await githubFetch(`/repos/${config.owner}/${config.repo}/pulls/${prNumber}`);
      
      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.merged_at ? 'merged' : pr.state,
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
        },
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFiles: pr.changed_files || 0,
        labels: pr.labels?.map((l: any) => l.name) || [],
        reviewState: 'pending',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pull request';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config, githubFetch]);

  const fetchPRFiles = useCallback(async (prNumber: number): Promise<PRFile[]> => {
    if (!config) return [];

    try {
      const files = await githubFetch(`/repos/${config.owner}/${config.repo}/pulls/${prNumber}/files`);
      return files.map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      }));
    } catch (err) {
      console.error('Failed to fetch PR files:', err);
      return [];
    }
  }, [config, githubFetch]);

  return {
    config,
    setConfig,
    pullRequests,
    isLoading,
    error,
    fetchPullRequests,
    fetchPullRequest,
    fetchPRFiles,
    testConnection,
  };
}