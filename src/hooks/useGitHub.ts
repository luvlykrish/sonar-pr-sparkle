import { useState, useCallback, useEffect } from 'react';
import { GitHubConfig, PullRequest } from '@/types/codeReview';
import { toast } from '@/hooks/use-toast';
import { useConfigDatabase, getPRCommentId, savePRCommentId } from '@/hooks/useConfigDatabase';

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
  postPRComment: (prNumber: number, body: string) => Promise<boolean>;
  mergePR: (prNumber: number, commitTitle?: string) => Promise<boolean>;
}

interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export function useGitHub(): UseGitHubReturn {
  const { getGitHubConfig, saveConfig } = useConfigDatabase();
  const [config, setConfigState] = useState<GitHubConfig | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load config from database on mount
  useEffect(() => {
    const loadConfig = async () => {
      const dbConfig = await getGitHubConfig();
      if (dbConfig) {
        setConfigState(dbConfig);
      }
      setIsInitialized(true);
    };
    loadConfig();
  }, [getGitHubConfig]);

  const setConfig = useCallback(async (newConfig: GitHubConfig) => {
    setConfigState(newConfig);
    await saveConfig('github', newConfig);
  }, [saveConfig]);

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

  const postPRComment = useCallback(async (prNumber: number, body: string): Promise<boolean> => {
    if (!config) return false;
    // Upsert pattern: find existing comment by this app (marker) and replace it, otherwise create a new comment.
    const MARKER = '<!-- codegate-auto-review -->';
    const bodyWithMarker = `${MARKER}\n${body}`;

    // header builder
    const buildHeaders = (authValue: string) => ({
      'Authorization': authValue,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    });

    try {
      // Get stored comment ID from database
      const storedId = await getPRCommentId(config.owner, config.repo, prNumber);

      const doFetch = async (method: string, url: string, headers: Record<string, string>, bodyObj?: any) => {
        const res = await fetch(url, {
          method,
          headers,
          body: bodyObj ? JSON.stringify(bodyObj) : undefined,
        });
        return res;
      };

      // Try to PATCH the stored comment id first (fast path). If it fails, fall back to searching/upserting.
      if (storedId) {
        try {
          const url = `https://api.github.com/repos/${config.owner}/${config.repo}/issues/comments/${storedId}`;
          let response = await doFetch('PATCH', url, buildHeaders(`Bearer ${config.token}`), { body: bodyWithMarker });
          if (response.status === 403) {
            response = await doFetch('PATCH', url, buildHeaders(`token ${config.token}`), { body: bodyWithMarker });
          }

          if (response.ok) {
            toast({ title: 'Comment Updated', description: `Review updated on PR #${prNumber}` });
            return true;
          }
          // if 404 or other error, we'll continue to the general upsert flow
        } catch (e) {
          // ignore and continue to search-based upsert
          console.warn('Failed to PATCH stored comment id, falling back to search', e);
        }
      }

      // Get authenticated user login (to ensure we only update our own comments)
      const authUser = await githubFetch('/user').catch(() => null);
      const login = authUser?.login;
      // List existing comments
      const comments = await githubFetch(`/repos/${config.owner}/${config.repo}/issues/${prNumber}/comments`).catch(() => []);

      const existing = comments.find((c: any) => {
        if (typeof c.body !== 'string') return false;
        // exact marker present
        if (c.body.includes(MARKER) && (login ? c.user?.login === login : true)) return true;
        // fallback: authored by the same user and looks like our AI review header
        if (login && c.user?.login === login && (c.body.includes(`## 🤖 AI Code Review for PR #`) || c.body.includes('Generated by'))) return true;
        return false;
      });

      const postUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${prNumber}/comments`;

      // prefer PATCH to update existing
      let response: Response;
      if (existing) {
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/issues/comments/${existing.id}`;
        response = await doFetch('PATCH', url, buildHeaders(`Bearer ${config.token}`), { body: bodyWithMarker });
        if (response.status === 403) {
          response = await doFetch('PATCH', url, buildHeaders(`token ${config.token}`), { body: bodyWithMarker });
        }

        if (response.ok) {
          await savePRCommentId(config.owner, config.repo, prNumber, String(existing.id));
        }
      } else {
        response = await doFetch('POST', postUrl, buildHeaders(`Bearer ${config.token}`), { body: bodyWithMarker });
        if (response.status === 403) {
          response = await doFetch('POST', postUrl, buildHeaders(`token ${config.token}`), { body: bodyWithMarker });
        }

        if (response.ok) {
          const rspJson = await response.json().catch(() => null);
          if (rspJson?.id) {
            await savePRCommentId(config.owner, config.repo, prNumber, String(rspJson.id));
          }
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData.message || `Failed to post/update comment: ${response.status}`;
        if (response.status === 403) {
          toast({ title: 'Failed to Post Comment (403)', description: `${message}. Token may lack required scopes.`, variant: 'destructive' });
        } else {
          toast({ title: 'Failed to Post Comment', description: message, variant: 'destructive' });
        }
        console.error('Comment API error', errData);
        return false;
      }

      toast({ title: existing ? 'Comment Updated' : 'Comment Posted', description: `Review posted to PR #${prNumber}` });
      return true;
    } catch (err) {
      console.error('Failed to upsert PR comment:', err);
      toast({ title: 'Failed to Post Comment', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      return false;
    }
  }, [config]);

  const mergePR = useCallback(async (prNumber: number, commitTitle?: string): Promise<boolean> => {
    if (!config) return false;

    try {
      const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit_title: commitTitle,
          merge_method: 'squash',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message = error.message || `Failed to merge: ${response.status}`;
        
        // Provide better error guidance for common issues
        let detailedMessage = message;
        if (response.status === 403) {
          if (message.includes('resource') || message.includes('accessible') || message.includes('token')) {
            detailedMessage = `${message}. Your GitHub token may lack required permissions. Please ensure your token has 'repo' scope (or 'contents:write' for fine-grained tokens) to merge PRs.`;
          } else if (message.includes('merge')) {
            detailedMessage = `${message}. This may be due to: (1) Branch protection rules requiring approvals, (2) Pending status checks, (3) Merge conflicts, or (4) PR is in draft state.`;
          }
        }
        
        throw new Error(detailedMessage);
      }

      toast({
        title: "PR Merged",
        description: `PR #${prNumber} has been merged successfully`,
      });
      return true;
    } catch (err) {
      console.error('Failed to merge PR:', err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error('Full error details:', err);
      
      toast({
        title: "Failed to Merge PR",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [config]);

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
    postPRComment,
    mergePR,
  };
}