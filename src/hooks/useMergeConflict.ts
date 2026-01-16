import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GitHubConfig, AIConfig } from '@/types/codeReview';

export interface ConflictFile {
  filename: string;
  conflictMarkers: ConflictMarker[];
  hasBusinessLogic: boolean;
  rawContent?: string;
}

export interface ConflictMarker {
  startLine: number;
  endLine: number;
  oursContent: string;
  theirsContent: string;
  baseContent?: string;
}

export interface ConflictResolution {
  filename: string;
  strategy: 'ours' | 'theirs' | 'manual' | 'ai_assisted';
  resolvedContent: string;
  aiAnalysis?: string;
}

export type MergeStrategy = 'ours' | 'theirs' | 'merge' | 'squash' | 'rebase';

interface UseMergeConflictReturn {
  isCheckingConflicts: boolean;
  hasConflicts: boolean;
  conflictFiles: ConflictFile[];
  checkForConflicts: (prNumber: number, config: GitHubConfig) => Promise<boolean>;
  analyzeConflictWithAI: (file: ConflictFile, aiConfig: AIConfig) => Promise<string | null>;
  resolveConflict: (prNumber: number, resolution: ConflictResolution) => Promise<boolean>;
  getMergeabilityStatus: (prNumber: number, config: GitHubConfig) => Promise<MergeabilityStatus | null>;
}

export interface MergeabilityStatus {
  mergeable: boolean;
  mergeableState: 'clean' | 'dirty' | 'unstable' | 'blocked' | 'unknown';
  hasConflicts: boolean;
  blockedBy: string[];
  behindBy: number;
  aheadBy: number;
}

export function useMergeConflict(): UseMergeConflictReturn {
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [conflictFiles, setConflictFiles] = useState<ConflictFile[]>([]);

  const getMergeabilityStatus = useCallback(async (
    prNumber: number, 
    config: GitHubConfig
  ): Promise<MergeabilityStatus | null> => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/pulls/${prNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch PR mergeability:', response.status);
        return null;
      }

      const pr = await response.json();

      // GitHub needs a moment to compute mergeability
      // mergeable can be null if not yet computed
      const mergeable = pr.mergeable ?? null;
      const mergeableState = pr.mergeable_state || 'unknown';

      const blockedBy: string[] = [];
      if (mergeableState === 'blocked') {
        blockedBy.push('Branch protection rules require status checks or reviews');
      }
      if (mergeableState === 'dirty') {
        blockedBy.push('Merge conflicts detected');
      }

      return {
        mergeable: mergeable === true,
        mergeableState,
        hasConflicts: mergeableState === 'dirty',
        blockedBy,
        behindBy: pr.behind_by || 0,
        aheadBy: pr.ahead_by || 0,
      };
    } catch (err) {
      console.error('Error checking mergeability:', err);
      return null;
    }
  }, []);

  const checkForConflicts = useCallback(async (
    prNumber: number, 
    config: GitHubConfig
  ): Promise<boolean> => {
    setIsCheckingConflicts(true);
    setConflictFiles([]);

    try {
      // First, get the PR mergeability status
      const status = await getMergeabilityStatus(prNumber, config);
      
      if (!status) {
        toast({
          title: "Error",
          description: "Failed to check merge conflicts",
          variant: "destructive",
        });
        return false;
      }

      if (status.hasConflicts) {
        setHasConflicts(true);

        // Fetch the files to analyze conflicts
        const filesResponse = await fetch(
          `https://api.github.com/repos/${config.owner}/${config.repo}/pulls/${prNumber}/files`,
          {
            headers: {
              'Authorization': `Bearer ${config.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );

        if (filesResponse.ok) {
          const files = await filesResponse.json();
          
          // Mark files with potential conflicts (status 'modified' in both branches)
          const potentialConflicts: ConflictFile[] = files
            .filter((f: any) => f.status === 'modified')
            .map((f: any) => ({
              filename: f.filename,
              conflictMarkers: [], // Would need to parse actual content for real markers
              hasBusinessLogic: detectBusinessLogic(f.filename, f.patch || ''),
              rawContent: f.patch,
            }));

          setConflictFiles(potentialConflicts);
        }

        toast({
          title: "Merge Conflicts Detected",
          description: `This PR has merge conflicts that need to be resolved before merging.`,
          variant: "destructive",
        });
        return true;
      }

      setHasConflicts(false);
      return false;
    } catch (err) {
      console.error('Error checking conflicts:', err);
      toast({
        title: "Error",
        description: "Failed to check for merge conflicts",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [getMergeabilityStatus]);

  const analyzeConflictWithAI = useCallback(async (
    file: ConflictFile,
    aiConfig: AIConfig
  ): Promise<string | null> => {
    if (!aiConfig.apiKey) {
      toast({
        title: "AI Not Configured",
        description: "Please configure your AI API key to use AI-assisted conflict resolution",
        variant: "destructive",
      });
      return null;
    }

    try {
      const prompt = buildConflictAnalysisPrompt(file);
      const response = await callAIForConflict(aiConfig, prompt);
      return response;
    } catch (err) {
      console.error('AI conflict analysis failed:', err);
      toast({
        title: "AI Analysis Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  const resolveConflict = useCallback(async (
    prNumber: number,
    resolution: ConflictResolution
  ): Promise<boolean> => {
    try {
      // Save resolution to database for tracking
      const { error } = await supabase
        .from('merge_conflict_resolutions')
        .insert({
          pr_number: prNumber,
          file_path: resolution.filename,
          resolution_strategy: resolution.strategy,
          resolved_content: resolution.resolvedContent,
          has_business_logic: false,
          ai_analysis: resolution.aiAnalysis,
          status: 'resolved',
        });

      if (error) {
        console.error('Failed to save conflict resolution:', error);
        return false;
      }

      toast({
        title: "Conflict Resolved",
        description: `Resolution saved for ${resolution.filename}`,
      });
      return true;
    } catch (err) {
      console.error('Error resolving conflict:', err);
      return false;
    }
  }, []);

  return {
    isCheckingConflicts,
    hasConflicts,
    conflictFiles,
    checkForConflicts,
    analyzeConflictWithAI,
    resolveConflict,
    getMergeabilityStatus,
  };
}

// Helper function to detect if file contains business logic
function detectBusinessLogic(filename: string, patch: string): boolean {
  // Check file extensions that typically contain business logic
  const businessLogicExtensions = ['.ts', '.tsx', '.js', '.jsx', '.java', '.py', '.cs', '.go'];
  const hasBusinessExtension = businessLogicExtensions.some(ext => filename.endsWith(ext));
  
  if (!hasBusinessExtension) return false;

  // Check for patterns that indicate business logic
  const businessPatterns = [
    /function\s+\w+/,
    /class\s+\w+/,
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>/,
    /async\s+function/,
    /export\s+(default\s+)?function/,
    /interface\s+\w+/,
    /type\s+\w+\s*=/,
  ];

  return businessPatterns.some(pattern => pattern.test(patch));
}

function buildConflictAnalysisPrompt(file: ConflictFile): string {
  return `You are an expert at analyzing merge conflicts and determining the best resolution strategy.

## File: ${file.filename}

### Conflict Details
${file.rawContent || 'No raw content available'}

### Analysis Required
1. Identify what changes are in conflict
2. Determine if the conflict involves business logic or just formatting/structure
3. Suggest the safest resolution strategy:
   - "ours" - Keep our changes (current branch)
   - "theirs" - Keep their changes (incoming branch)  
   - "manual" - Requires manual review due to complex business logic
   - "ai_assisted" - Can be automatically merged with AI assistance

4. If the conflict does NOT involve business logic (e.g., import statements, formatting, comments), provide the resolved content.

Respond in JSON format:
{
  "hasBusinessLogic": true/false,
  "conflictType": "imports|formatting|logic|structure|mixed",
  "recommendation": "ours|theirs|manual|ai_assisted",
  "reasoning": "explanation",
  "canAutoResolve": true/false,
  "resolvedContent": "merged code if canAutoResolve is true"
}`;
}

async function callAIForConflict(config: AIConfig, prompt: string): Promise<string> {
  const { provider, apiKey, model } = config;

  let endpoint: string;
  let headers: Record<string, string>;
  let body: any;

  switch (provider) {
    case 'openai':
      endpoint = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };
      body = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 4000,
      };
      break;

    case 'anthropic':
      endpoint = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      };
      body = {
        model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      };
      break;

    case 'google':
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
      body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
      };
      break;

    case 'groq':
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };
      body = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 4000,
      };
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();

  switch (provider) {
    case 'openai':
    case 'groq':
      return data.choices?.[0]?.message?.content || '';
    case 'anthropic':
      return data.content?.[0]?.text || '';
    case 'google':
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    default:
      return '';
  }
}
