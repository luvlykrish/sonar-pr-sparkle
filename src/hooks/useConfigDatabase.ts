import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  GitHubConfig, 
  JiraConfig, 
  AIConfig, 
  ThresholdConfig,
  DEFAULT_JIRA_CONFIG,
  DEFAULT_AI_CONFIG,
  DEFAULT_THRESHOLDS
} from '@/types/codeReview';

export type ConfigType = 'github' | 'jira' | 'ai' | 'thresholds';

interface UseConfigDatabaseReturn {
  isLoading: boolean;
  error: string | null;
  getConfig: <T>(type: ConfigType) => Promise<T | null>;
  saveConfig: <T>(type: ConfigType, data: T) => Promise<boolean>;
  // Specific config getters with defaults
  getGitHubConfig: () => Promise<GitHubConfig | null>;
  getJiraConfig: () => Promise<JiraConfig>;
  getAIConfig: () => Promise<AIConfig>;
  getThresholds: () => Promise<ThresholdConfig>;
}

export function useConfigDatabase(): UseConfigDatabaseReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getConfig = useCallback(async <T>(type: ConfigType): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('app_configurations')
        .select('config_data')
        .eq('config_type', type)
        .maybeSingle();

      if (fetchError) {
        console.error(`Failed to fetch ${type} config:`, fetchError);
        setError(fetchError.message);
        return null;
      }

      return data?.config_data as T || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async <T>(type: ConfigType, data: T): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: upsertError } = await supabase
        .from('app_configurations')
        .upsert(
          { config_type: type, config_data: data as any },
          { onConflict: 'config_type' }
        );

      if (upsertError) {
        console.error(`Failed to save ${type} config:`, upsertError);
        setError(upsertError.message);
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGitHubConfig = useCallback(async (): Promise<GitHubConfig | null> => {
    return getConfig<GitHubConfig>('github');
  }, [getConfig]);

  const getJiraConfig = useCallback(async (): Promise<JiraConfig> => {
    const config = await getConfig<JiraConfig>('jira');
    return config || DEFAULT_JIRA_CONFIG;
  }, [getConfig]);

  const getAIConfig = useCallback(async (): Promise<AIConfig> => {
    const config = await getConfig<AIConfig>('ai');
    return config || DEFAULT_AI_CONFIG;
  }, [getConfig]);

  const getThresholds = useCallback(async (): Promise<ThresholdConfig> => {
    const config = await getConfig<ThresholdConfig>('thresholds');
    return config || DEFAULT_THRESHOLDS;
  }, [getConfig]);

  return {
    isLoading,
    error,
    getConfig,
    saveConfig,
    getGitHubConfig,
    getJiraConfig,
    getAIConfig,
    getThresholds,
  };
}

// Auto-merge history database functions
export interface AutoMergeHistoryEntry {
  timestamp: string;
  aiScore: number;
  sonarIssues: number;
  mode: 'less' | 'greater';
  aiThreshold: number;
  sonarThreshold: number;
  decision: 'will_merge' | 'will_not_merge' | 'merged' | 'merge_failed' | 'disabled';
  details?: string;
}

export async function getAutoMergeHistory(prNumber: number): Promise<AutoMergeHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('auto_merge_history')
      .select('*')
      .eq('pr_number', prNumber)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch auto-merge history:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      timestamp: row.created_at,
      aiScore: Number(row.ai_score) || 0,
      sonarIssues: row.sonar_issues || 0,
      mode: row.mode || 'less',
      aiThreshold: Number(row.ai_threshold) || 70,
      sonarThreshold: Number(row.sonar_threshold) || 5,
      decision: row.decision || 'disabled',
      details: row.details,
    }));
  } catch (err) {
    console.error('Failed to read auto-merge history', err);
    return [];
  }
}

export async function saveAutoMergeHistory(prNumber: number, entry: AutoMergeHistoryEntry): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('auto_merge_history')
      .insert({
        pr_number: prNumber,
        ai_score: entry.aiScore,
        sonar_issues: entry.sonarIssues,
        mode: entry.mode,
        ai_threshold: entry.aiThreshold,
        sonar_threshold: entry.sonarThreshold,
        decision: entry.decision,
        details: entry.details,
      });

    if (error) {
      console.error('Failed to save auto-merge history:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to write auto-merge history', err);
    return false;
  }
}

// PR Comment ID database functions
export async function getPRCommentId(owner: string, repo: string, prNumber: number): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('pr_comment_ids')
      .select('comment_id')
      .eq('owner', owner)
      .eq('repo', repo)
      .eq('pr_number', prNumber)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch PR comment ID:', error);
      return null;
    }

    return data?.comment_id || null;
  } catch (err) {
    console.error('Failed to read PR comment ID', err);
    return null;
  }
}

export async function savePRCommentId(owner: string, repo: string, prNumber: number, commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pr_comment_ids')
      .upsert(
        { owner, repo, pr_number: prNumber, comment_id: commentId },
        { onConflict: 'owner,repo,pr_number' }
      );

    if (error) {
      console.error('Failed to save PR comment ID:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to write PR comment ID', err);
    return false;
  }
}
