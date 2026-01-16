import { useState, useCallback, useEffect } from 'react';
import { AIConfig, AIReviewResult, PullRequest, ReviewCommand, DEFAULT_AI_CONFIG, JiraTicket, BusinessLogicValidation } from '@/types/codeReview';
import { toast } from '@/hooks/use-toast';
import { useConfigDatabase } from '@/hooks/useConfigDatabase';

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
  generateReview: (pr: PullRequest, files: PRFile[], command: ReviewCommand, jiraTicket?: JiraTicket | null) => Promise<AIReviewResult | null>;
  validateBusinessLogic: (pr: PullRequest, files: PRFile[], jiraTicket: JiraTicket) => Promise<BusinessLogicValidation | null>;
  isGenerating: boolean;
}

export function useAIReview(): UseAIReviewReturn {
  const { getAIConfig, saveConfig } = useConfigDatabase();
  const [aiConfig, setAIConfigState] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load config from database on mount
  useEffect(() => {
    const loadConfig = async () => {
      const dbConfig = await getAIConfig();
      setAIConfigState(dbConfig);
    };
    loadConfig();
  }, [getAIConfig]);

  const setAIConfig = useCallback(async (config: AIConfig) => {
    setAIConfigState(config);
    await saveConfig('ai', config);
  }, [saveConfig]);

  const generateReview = useCallback(async (
    pr: PullRequest,
    files: PRFile[],
    command: ReviewCommand,
    jiraTicket?: JiraTicket | null
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
      const prompt = buildReviewPrompt(pr, files, command, jiraTicket);
      const response = await callAIProvider(aiConfig, prompt);
      const review = parseAIResponse(response, aiConfig);
      
      toast({
        title: "AI Review Generated",
        description: `Review completed using ${aiConfig.provider}${jiraTicket ? ' with business logic validation' : ''}`,
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

  const validateBusinessLogic = useCallback(async (
    pr: PullRequest,
    files: PRFile[],
    jiraTicket: JiraTicket
  ): Promise<BusinessLogicValidation | null> => {
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
      const prompt = buildBusinessLogicPrompt(pr, files, jiraTicket);
      const response = await callAIProvider(aiConfig, prompt);
      const validation = parseBusinessLogicResponse(response, jiraTicket.key);
      
      toast({
        title: "Business Logic Validation Complete",
        description: `Validated against ${jiraTicket.key}`,
      });

      return validation;
    } catch (error) {
      console.error('Business logic validation error:', error);
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Failed to validate",
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
    validateBusinessLogic,
    isGenerating,
  };
}

function buildReviewPrompt(pr: PullRequest, files: PRFile[], command: ReviewCommand, jiraTicket?: JiraTicket | null): string {
  const fileDiffs = files
    .filter(f => f.patch)
    .map(f => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');

  let jiraContext = '';
  if (jiraTicket) {
    jiraContext = `
### Linked Jira Ticket: ${jiraTicket.key}
**Summary:** ${jiraTicket.summary}
**Type:** ${jiraTicket.type} | **Priority:** ${jiraTicket.priority} | **Status:** ${jiraTicket.status}

**Description:**
${jiraTicket.description || 'No description provided'}

${jiraTicket.acceptanceCriteria ? `**Acceptance Criteria:**
${jiraTicket.acceptanceCriteria}` : ''}

${jiraTicket.attachments.length > 0 ? `**Attachments:** ${jiraTicket.attachments.length} image(s) attached (UI mockups/screenshots may be present)` : ''}
`;
  }

  const baseContext = `
## Pull Request #${pr.number}: ${pr.title}

**Author:** ${pr.author}
**Branch:** ${pr.head.ref} → ${pr.base.ref}
**Changes:** ${pr.additions} additions, ${pr.deletions} deletions across ${pr.changedFiles} files

### Description
${pr.body || 'No description provided'}
${jiraContext}
### Code Changes
${fileDiffs || 'No code diff available'}
`;

  const businessLogicInstructions = jiraTicket ? `
IMPORTANT: This PR is linked to Jira ticket ${jiraTicket.key}. You MUST:
1. Validate that the code changes align with the requirements in the Jira ticket
2. Check if acceptance criteria (if any) are addressed by the code
3. Identify any gaps between requirements and implementation
4. Note any code that goes beyond the scope of the ticket
5. Include a "businessLogicValidation" section in your response with score 0-100
` : '';

  const instructions = {
    review: `You are an expert code reviewer. Analyze this pull request and provide:
1. A concise summary of the changes
2. Code quality score (0-100) for: overall, codeQuality, security, performance, maintainability, testability
3. Specific suggestions for improvement with severity (low/medium/high/critical), type (improvement/bug/security/performance/style), file location, and line numbers
4. A recommended action: APPROVE, REQUEST_CHANGES, or COMMENT
${businessLogicInstructions}
Respond in this JSON format:
{
  "summary": "...",
  "overallScore": 85,
  "categories": { "codeQuality": 80, "security": 90, "performance": 75, "maintainability": 85, "testability": 70 },
  "suggestions": [
    { "type": "security", "severity": "high", "file": "...", "line": 42, "message": "...", "suggestion": "..." }
  ],
  ${jiraTicket ? `"businessLogicValidation": {
    "ticketKey": "${jiraTicket.key}",
    "score": 85,
    "summary": "...",
    "implementedRequirements": ["requirement 1", "requirement 2"],
    "missingRequirements": [],
    "additionalChanges": []
  },` : ''}
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

function buildBusinessLogicPrompt(pr: PullRequest, files: PRFile[], jiraTicket: JiraTicket): string {
  const fileDiffs = files
    .filter(f => f.patch)
    .map(f => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');

  return `You are an expert at validating code changes against business requirements.

## Jira Ticket: ${jiraTicket.key}
**Summary:** ${jiraTicket.summary}
**Type:** ${jiraTicket.type}
**Priority:** ${jiraTicket.priority}

### Requirements
${jiraTicket.description || 'No description provided'}

${jiraTicket.acceptanceCriteria ? `### Acceptance Criteria
${jiraTicket.acceptanceCriteria}` : ''}

${jiraTicket.attachments.length > 0 ? `### Visual Requirements
${jiraTicket.attachments.length} image attachment(s) present - UI mockups or screenshots may define visual requirements.` : ''}

## Pull Request #${pr.number}: ${pr.title}
**Changes:** ${pr.additions} additions, ${pr.deletions} deletions across ${pr.changedFiles} files

### PR Description
${pr.body || 'No description provided'}

### Code Changes
${fileDiffs || 'No code diff available'}

## Your Task
Analyze the code changes and validate them against the Jira ticket requirements. Provide:
1. Extract all requirements from the Jira ticket (title, description, acceptance criteria)
2. Map each requirement to code changes that implement it
3. Identify any requirements that are NOT implemented in this PR
4. Identify any requirements that are PARTIALLY implemented
5. Note any code changes that go BEYOND the scope of the ticket

Respond in this JSON format:
{
  "requirements": ["list of all requirements extracted from Jira"],
  "implementedRequirements": ["requirements fully addressed by code"],
  "missingRequirements": ["requirements NOT addressed"],
  "partiallyImplemented": ["requirements partially addressed with explanation"],
  "additionalChanges": ["changes not in requirements"],
  "score": 85,
  "summary": "Brief validation summary"
}`;
}

function parseBusinessLogicResponse(response: string, ticketKey: string): BusinessLogicValidation {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                      response.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, response];
    
    const jsonStr = jsonMatch[1] || response;
    const parsed = JSON.parse(jsonStr.trim());

    return {
      ticketKey,
      requirements: parsed.requirements || [],
      implementedRequirements: parsed.implementedRequirements || [],
      missingRequirements: parsed.missingRequirements || [],
      partiallyImplemented: parsed.partiallyImplemented || [],
      additionalChanges: parsed.additionalChanges || [],
      score: parsed.score || 0,
      summary: parsed.summary || 'Validation complete',
    };
  } catch {
    return {
      ticketKey,
      requirements: [],
      implementedRequirements: [],
      missingRequirements: [],
      partiallyImplemented: [],
      additionalChanges: [],
      score: 0,
      summary: 'Failed to parse validation response',
    };
  }
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