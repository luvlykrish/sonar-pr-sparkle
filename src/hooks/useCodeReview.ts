import { useState, useCallback } from 'react';
import { 
  PullRequest, 
  SonarQubeResults, 
  AIReviewResult, 
  ThresholdConfig, 
  DEFAULT_THRESHOLDS,
  ReviewCommand 
} from '@/types/codeReview';
import { toast } from '@/hooks/use-toast';

interface UseCodeReviewReturn {
  thresholds: ThresholdConfig;
  setThresholds: (thresholds: ThresholdConfig) => void;
  analyzePR: (pr: PullRequest, files: PRFile[]) => Promise<void>;
  generateAIReview: (pr: PullRequest, command: ReviewCommand) => Promise<AIReviewResult | null>;
  mockSonarResults: (pr: PullRequest) => SonarQubeResults;
  isAnalyzing: boolean;
  analysisProgress: number;
}

interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export function useCodeReview(): UseCodeReviewReturn {
  const [thresholds, setThresholdsState] = useState<ThresholdConfig>(() => {
    const saved = localStorage.getItem('sonar_thresholds');
    return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const setThresholds = useCallback((newThresholds: ThresholdConfig) => {
    setThresholdsState(newThresholds);
    localStorage.setItem('sonar_thresholds', JSON.stringify(newThresholds));
  }, []);

  // Mock SonarQube results for demonstration
  const mockSonarResults = useCallback((pr: PullRequest): SonarQubeResults => {
    const bugs = Math.floor(Math.random() * 5);
    const vulnerabilities = Math.floor(Math.random() * 3);
    const codeSmells = Math.floor(Math.random() * 20);
    const coverage = 70 + Math.random() * 25;
    const duplicatedLines = Math.random() * 5;
    const securityHotspots = Math.floor(Math.random() * 4);

    const checkThreshold = (value: number, threshold: number, inverse = false): boolean => {
      return inverse ? value < threshold : value > threshold;
    };

    const violations: string[] = [];
    if (bugs > thresholds.bugs) violations.push(`Bugs: ${bugs} (threshold: ${thresholds.bugs})`);
    if (vulnerabilities > thresholds.vulnerabilities) violations.push(`Vulnerabilities: ${vulnerabilities} (threshold: ${thresholds.vulnerabilities})`);
    if (codeSmells > thresholds.codeSmells) violations.push(`Code Smells: ${codeSmells} (threshold: ${thresholds.codeSmells})`);
    if (coverage < thresholds.coverageMin) violations.push(`Coverage: ${coverage.toFixed(1)}% (minimum: ${thresholds.coverageMin}%)`);
    if (duplicatedLines > thresholds.duplicatedLinesMax) violations.push(`Duplicated Lines: ${duplicatedLines.toFixed(1)}% (max: ${thresholds.duplicatedLinesMax}%)`);

    const blockerCount = Math.floor(Math.random() * 2);
    const criticalCount = Math.floor(Math.random() * 3);
    const majorCount = Math.floor(Math.random() * 8);
    const minorCount = Math.floor(Math.random() * 15);

    return {
      scanMetadata: {
        projectKey: `pr-${pr.number}`,
        pullRequest: pr.number,
        timestamp: new Date().toISOString(),
        scanDuration: 45 + Math.floor(Math.random() * 60),
      },
      qualityGate: {
        status: violations.length > 0 ? 'ERROR' : 'OK',
        conditions: [
          { metric: 'new_bugs', operator: 'GT', value: String(bugs), status: bugs > thresholds.bugs ? 'ERROR' : 'OK', errorThreshold: String(thresholds.bugs) },
          { metric: 'new_vulnerabilities', operator: 'GT', value: String(vulnerabilities), status: vulnerabilities > thresholds.vulnerabilities ? 'ERROR' : 'OK', errorThreshold: String(thresholds.vulnerabilities) },
          { metric: 'new_coverage', operator: 'LT', value: coverage.toFixed(1), status: coverage < thresholds.coverageMin ? 'ERROR' : 'OK', errorThreshold: String(thresholds.coverageMin) },
        ],
      },
      metrics: {
        bugs: { value: bugs, threshold: thresholds.bugs, exceeded: bugs > thresholds.bugs },
        vulnerabilities: { value: vulnerabilities, threshold: thresholds.vulnerabilities, exceeded: vulnerabilities > thresholds.vulnerabilities },
        codeSmells: { value: codeSmells, threshold: thresholds.codeSmells, exceeded: codeSmells > thresholds.codeSmells },
        coverage: { value: coverage.toFixed(1), threshold: thresholds.coverageMin, exceeded: coverage < thresholds.coverageMin },
        duplicatedLinesDensity: { value: duplicatedLines.toFixed(1), threshold: thresholds.duplicatedLinesMax, exceeded: duplicatedLines > thresholds.duplicatedLinesMax },
        securityHotspots: { value: securityHotspots, threshold: thresholds.securityHotspots, exceeded: securityHotspots > thresholds.securityHotspots },
        technicalDebt: { value: `${Math.floor(Math.random() * 4)}h ${Math.floor(Math.random() * 60)}min`, threshold: 0, exceeded: false },
      },
      issuesSummary: {
        bySeverity: {
          blocker: { count: blockerCount, threshold: thresholds.blockerIssues, exceeded: blockerCount > thresholds.blockerIssues },
          critical: { count: criticalCount, threshold: thresholds.criticalIssues, exceeded: criticalCount > thresholds.criticalIssues },
          major: { count: majorCount, threshold: 10, exceeded: false },
          minor: { count: minorCount, threshold: 20, exceeded: false },
          info: { count: Math.floor(Math.random() * 5), threshold: 100, exceeded: false },
        },
        byType: {
          bug: { count: bugs, threshold: thresholds.bugs, exceeded: bugs > thresholds.bugs },
          vulnerability: { count: vulnerabilities, threshold: thresholds.vulnerabilities, exceeded: vulnerabilities > thresholds.vulnerabilities },
          codeSmell: { count: codeSmells, threshold: thresholds.codeSmells, exceeded: codeSmells > thresholds.codeSmells },
          securityHotspot: { count: securityHotspots, threshold: thresholds.securityHotspots, exceeded: securityHotspots > thresholds.securityHotspots },
        },
        total: bugs + vulnerabilities + codeSmells + securityHotspots,
      },
      issuesDetailed: generateMockIssues(pr, bugs, vulnerabilities, codeSmells),
      thresholdCheck: {
        exceeded: violations.length > 0,
        violations,
      },
      links: {
        dashboard: `https://sonarqube.example.com/dashboard?id=pr-${pr.number}`,
        issues: `https://sonarqube.example.com/project/issues?id=pr-${pr.number}`,
        securityHotspots: `https://sonarqube.example.com/security_hotspots?id=pr-${pr.number}`,
      },
    };
  }, [thresholds]);

  const analyzePR = useCallback(async (pr: PullRequest, files: PRFile[]) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate analysis progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setAnalysisProgress(i);
      }

      toast({
        title: "Analysis Complete",
        description: `PR #${pr.number} has been analyzed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze pull request.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  }, []);

  const generateAIReview = useCallback(async (pr: PullRequest, command: ReviewCommand): Promise<AIReviewResult | null> => {
    // This would integrate with OpenAI in production
    // For now, return mock data
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockReview: AIReviewResult = {
      summary: `This pull request introduces ${pr.changedFiles} file changes with ${pr.additions} additions and ${pr.deletions} deletions. The changes appear to focus on ${pr.title.toLowerCase().includes('fix') ? 'bug fixes' : 'feature implementation'}.`,
      title: `${pr.title.split(':')[0]}: ${pr.title.split(':')[1] || 'Update implementation'}`,
      guide: `## Review Guide for PR #${pr.number}\n\n### Key Areas to Review\n1. **Logic Changes**: Focus on the core business logic modifications\n2. **Error Handling**: Verify proper error handling is in place\n3. **Test Coverage**: Ensure adequate test coverage for new code\n\n### Files Changed\n${pr.changedFiles} files modified`,
      suggestions: [
        {
          id: '1',
          type: 'improvement',
          severity: 'medium',
          file: 'src/main.ts',
          line: 42,
          message: 'Consider extracting this logic into a separate function for better maintainability.',
          suggestion: 'Extract the validation logic into a dedicated validateInput() function.',
          status: 'pending',
        },
        {
          id: '2',
          type: 'security',
          severity: 'high',
          file: 'src/api/handler.ts',
          line: 15,
          message: 'Input should be sanitized before processing.',
          suggestion: 'Add input sanitization using a library like DOMPurify or validator.js.',
          status: 'pending',
        },
      ],
      overallScore: 72 + Math.floor(Math.random() * 20),
      categories: {
        codeQuality: 70 + Math.floor(Math.random() * 25),
        security: 65 + Math.floor(Math.random() * 30),
        performance: 75 + Math.floor(Math.random() * 20),
        maintainability: 68 + Math.floor(Math.random() * 25),
        testability: 60 + Math.floor(Math.random() * 35),
      },
      timestamp: new Date().toISOString(),
      model: 'gpt-4 (mock)',
    };

    return mockReview;
  }, []);

  return {
    thresholds,
    setThresholds,
    analyzePR,
    generateAIReview,
    mockSonarResults,
    isAnalyzing,
    analysisProgress,
  };
}

function generateMockIssues(pr: PullRequest, bugs: number, vulnerabilities: number, codeSmells: number) {
  const issues = [];
  const severities = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'] as const;
  const messages = [
    'Remove this unused variable.',
    'Refactor this method to reduce its cognitive complexity.',
    'This block of commented-out code should be removed.',
    'Make sure that using this pseudorandom number generator is safe here.',
    'Complete the task associated with this TODO comment.',
    'Remove this redundant type assertion.',
    'Use const or let instead of var.',
    'Expected indentation of 2 spaces but found 4.',
  ];

  const totalIssues = bugs + vulnerabilities + codeSmells;
  for (let i = 0; i < Math.min(totalIssues, 20); i++) {
    const type = i < bugs ? 'BUG' : i < bugs + vulnerabilities ? 'VULNERABILITY' : 'CODE_SMELL';
    issues.push({
      key: `issue-${i}`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      type,
      message: messages[Math.floor(Math.random() * messages.length)],
      component: `src/components/Component${Math.floor(Math.random() * 10)}.tsx`,
      line: Math.floor(Math.random() * 200) + 1,
      rule: `typescript:S${1000 + Math.floor(Math.random() * 5000)}`,
      effort: `${Math.floor(Math.random() * 30) + 5}min`,
      status: 'OPEN',
    });
  }

  return issues;
}