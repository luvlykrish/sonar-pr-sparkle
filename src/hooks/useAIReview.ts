import { useState, useCallback } from 'react';
import { AIConfig, AIReviewResult, PullRequest, ReviewCommand, DEFAULT_AI_CONFIG } from '@/types/codeReview';
import { toast } from '@/hooks/use-toast';

interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

interface UseAIReviewReturn {
  aiConfig: AIConfig;
  setAIConfig: (config: AIConfig) => void;
  generateReview: (pr: PullRequest, files: PRFile[], command: ReviewCommand) => Promise<AIReviewResult | null>;
  isGenerating: boolean;
}

export function useAIReview(): UseAIReviewReturn {
  const [aiConfig, setAIConfigState] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('ai_config');
    return saved ? JSON.parse(saved) : DEFAULT_AI_CONFIG;
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const setAIConfig = useCallback((config: AIConfig) => {
    setAIConfigState(config);
    localStorage.setItem('ai_config', JSON.stringify(config));
  }, []);

  const generateReview = useCallback(async (
    pr: PullRequest,
    files: PRFile[],
    command: ReviewCommand
  ): Promise<AIReviewResult | null> => {
    if (!aiConfig.apiKey) {
      toast({
        title: "AI Not Configured",
        description: "Please configure your AI API key in Settings",
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);

    try {
      const prompt = buildReviewPrompt(pr, files, command);
      const response = await callAIProvider(aiConfig, prompt);
      const review = parseAIResponse(response, aiConfig);
      
      toast({
        title: "AI Review Generated",
        description: `Review completed using ${aiConfig.provider}`,
      });

      return review;
    } catch (error) {
      console.error('AI Review error:', error);
      toast({
        title: "AI Review Failed",
        description: error instanceof Error ? error.message : "Failed to generate review",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [aiConfig]);

  return {
    aiConfig,
    setAIConfig,
    generateReview,
    isGenerating,
  };
}

function buildReviewPrompt(pr: PullRequest, files: PRFile[], command: ReviewCommand): string {
  const fileDiffs = files
    .filter(f => f.patch)
    .map(f => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');

  const baseContext = `
## Pull Request #${pr.number}: ${pr.title}

**Author:** ${pr.author}
**Branch:** ${pr.head.ref} → ${pr.base.ref}
**Changes:** ${pr.additions} additions, ${pr.deletions} deletions across ${pr.changedFiles} files

### Description
${pr.body || 'No description provided'}

### Code Changes
${fileDiffs || 'No code diff available'}
`;

  const instructions = {
    review: `You are an expert code reviewer. Analyze this pull request and provide:
1. A concise summary of the changes
2. Code quality score (0-100) for: overall, codeQuality, security, performance, maintainability, testability
3. Specific suggestions for improvement with severity (low/medium/high/critical), type (improvement/bug/security/performance/style), file location, and line numbers
4. A recommended action: APPROVE, REQUEST_CHANGES, or COMMENT

Respond in this JSON format:
{
  "summary": "...",
  "overallScore": 85,
  "categories": { "codeQuality": 80, "security": 90, "performance": 75, "maintainability": 85, "testability": 70 },
  "suggestions": [
    { "type": "security", "severity": "high", "file": "...", "line": 42, "message": "...", "suggestion": "..." }
  ],
  "recommendation": "APPROVE"
}`,
    summary: `Provide a brief summary of this PR's changes in 2-3 sentences. Respond with JSON: { "summary": "..." }`,
    guide: `Create a review guide for this PR with key areas to focus on. Respond with JSON: { "guide": "..." }`,
    title: `Suggest a better PR title following conventional commits format. Respond with JSON: { "title": "..." }`,
    dismiss: '',
    resolve: '',
    issue: '',
  };

  return `${instructions[command.type]}\n\n${baseContext}`;
}

async function callAIProvider(config: AIConfig, prompt: string): Promise<string> {
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
        temperature: 0.3,
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
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
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
        temperature: 0.3,
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

  // Extract content based on provider response format
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

function parseAIResponse(response: string, config: AIConfig): AIReviewResult {
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                      response.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, response];
    
    const jsonStr = jsonMatch[1] || response;
    const parsed = JSON.parse(jsonStr.trim());

    return {
      summary: parsed.summary || 'Review completed',
      title: parsed.title,
      guide: parsed.guide,
      suggestions: (parsed.suggestions || []).map((s: any, i: number) => ({
        id: String(i + 1),
        type: s.type || 'improvement',
        severity: s.severity || 'medium',
        file: s.file || 'unknown',
        line: s.line,
        message: s.message || '',
        suggestion: s.suggestion || '',
        status: 'pending',
      })),
      overallScore: parsed.overallScore || 70,
      categories: {
        codeQuality: parsed.categories?.codeQuality || 70,
        security: parsed.categories?.security || 70,
        performance: parsed.categories?.performance || 70,
        maintainability: parsed.categories?.maintainability || 70,
        testability: parsed.categories?.testability || 70,
      },
      timestamp: new Date().toISOString(),
      model: config.model,
    };
  } catch {
    // Fallback for non-JSON responses
    return {
      summary: response.slice(0, 500),
      suggestions: [],
      overallScore: 70,
      categories: {
        codeQuality: 70,
        security: 70,
        performance: 70,
        maintainability: 70,
        testability: 70,
      },
      timestamp: new Date().toISOString(),
      model: config.model,
    };
  }
}