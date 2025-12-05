export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  webhookSecret?: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  author: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  reviewState?: ReviewState;
  sonarResults?: SonarQubeResults;
  aiReview?: AIReviewResult;
}

export type ReviewState = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface SonarQubeResults {
  scanMetadata: {
    projectKey: string;
    pullRequest: number;
    timestamp: string;
    scanDuration: number;
  };
  qualityGate: {
    status: 'OK' | 'ERROR' | 'WARN';
    conditions: QualityGateCondition[];
  };
  metrics: {
    bugs: MetricValue;
    vulnerabilities: MetricValue;
    codeSmells: MetricValue;
    coverage: MetricValue;
    duplicatedLinesDensity: MetricValue;
    securityHotspots: MetricValue;
    technicalDebt: MetricValue;
  };
  issuesSummary: {
    bySeverity: {
      blocker: IssueCount;
      critical: IssueCount;
      major: IssueCount;
      minor: IssueCount;
      info: IssueCount;
    };
    byType: {
      bug: IssueCount;
      vulnerability: IssueCount;
      codeSmell: IssueCount;
      securityHotspot: IssueCount;
    };
    total: number;
  };
  issuesDetailed: SonarIssue[];
  thresholdCheck: {
    exceeded: boolean;
    violations: string[];
  };
  links: {
    dashboard: string;
    issues: string;
    securityHotspots: string;
  };
}

export interface QualityGateCondition {
  metric: string;
  operator: string;
  value: string;
  status: 'OK' | 'ERROR' | 'WARN';
  errorThreshold?: string;
}

export interface MetricValue {
  value: number | string;
  threshold: number | string;
  exceeded: boolean;
  rating?: string;
}

export interface IssueCount {
  count: number;
  threshold: number;
  exceeded: boolean;
}

export interface SonarIssue {
  key: string;
  severity: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  type: 'BUG' | 'VULNERABILITY' | 'CODE_SMELL' | 'SECURITY_HOTSPOT';
  message: string;
  component: string;
  line?: number;
  rule: string;
  effort?: string;
  debt?: string;
  status: string;
  resolution?: string;
}

export interface AIReviewResult {
  summary: string;
  title?: string;
  guide?: string;
  suggestions: AICodeSuggestion[];
  overallScore: number;
  categories: {
    codeQuality: number;
    security: number;
    performance: number;
    maintainability: number;
    testability: number;
  };
  timestamp: string;
  model: string;
}

export interface AICodeSuggestion {
  id: string;
  type: 'improvement' | 'bug' | 'security' | 'performance' | 'style';
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  message: string;
  suggestion: string;
  code?: {
    before: string;
    after: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'applied';
}

export interface ReviewCommand {
  type: 'review' | 'summary' | 'guide' | 'title' | 'dismiss' | 'resolve' | 'issue';
  prNumber: number;
  context?: string;
}

export interface WebhookEvent {
  action: string;
  pullRequest?: PullRequest;
  repository: {
    fullName: string;
  };
  sender: {
    login: string;
  };
}

export interface ThresholdConfig {
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
  securityHotspots: number;
  coverageMin: number;
  duplicatedLinesMax: number;
  blockerIssues: number;
  criticalIssues: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  bugs: 0,
  vulnerabilities: 0,
  codeSmells: 10,
  securityHotspots: 0,
  coverageMin: 80,
  duplicatedLinesMax: 3,
  blockerIssues: 0,
  criticalIssues: 0,
};

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  autoMergeEnabled: boolean;
  postToGitHub: boolean;
  /**
   * Auto-merge mode: 'less' means auto-merge when both AI and Sonar scores are less than thresholds.
   * 'greater' means auto-merge when both AI and Sonar scores are greater than thresholds.
   */
  autoMergeMode?: 'less' | 'greater';
  /** Threshold applied to AI overall score (0-100). */
  autoMergeThresholdAI?: number;
  /** Threshold applied to Sonar metric (issues total). */
  autoMergeThresholdSonar?: number;
  /** Threshold applied to JUnit test score (0-100) when Java files are present. */
  autoMergeThresholdJUnit?: number;
  /** When true, require JUnit threshold when Java files are present to auto-merge. */
  requireJUnitForJava?: boolean;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
  autoMergeEnabled: false,
  postToGitHub: true,
  autoMergeMode: 'less',
  autoMergeThresholdAI: 70,
  autoMergeThresholdSonar: 5,
  autoMergeThresholdJUnit: 70,
  requireJUnitForJava: false,
};

export const AI_MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
};