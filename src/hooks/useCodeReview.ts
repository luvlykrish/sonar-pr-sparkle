import { useState, useCallback } from 'react';
import { 
  PullRequest, 
  SonarQubeResults, 
  ThresholdConfig, 
  DEFAULT_THRESHOLDS 
} from '@/types/codeReview';
import { toast } from '@/hooks/use-toast';

interface UseCodeReviewReturn {
  thresholds: ThresholdConfig;
  setThresholds: (thresholds: ThresholdConfig) => void;
  analyzePR: (pr: PullRequest, files: PRFile[]) => Promise<void>;
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

  // Mock SonarQube results for demonstration (deterministic based on PR data)
  const mockSonarResults = useCallback((pr: PullRequest): SonarQubeResults => {
    // Use PR data (additions + deletions + files) as a seed for deterministic but varying results
    // This ensures the same PR always gets the same score within a session
    const seed = pr.additions + pr.deletions + pr.changedFiles;
    const seedHash = (seed * 73856093) ^ (pr.number * 19349663);
    const seededRandom = (index: number) => {
      const x = Math.sin(seedHash + index) * 10000;
      return x - Math.floor(x);
    };

    const bugs = Math.floor(seededRandom(1) * 5);
    const vulnerabilities = Math.floor(seededRandom(2) * 3);
    const codeSmells = Math.floor(seededRandom(3) * 20);
    const coverage = 70 + seededRandom(4) * 25;
    const duplicatedLines = seededRandom(5) * 5;
    const securityHotspots = Math.floor(seededRandom(6) * 4);

    const checkThreshold = (value: number, threshold: number, inverse = false): boolean => {
      return inverse ? value < threshold : value > threshold;
    };

    const violations: string[] = [];
    if (bugs > thresholds.bugs) violations.push(`Bugs: ${bugs} (threshold: ${thresholds.bugs})`);
    if (vulnerabilities > thresholds.vulnerabilities) violations.push(`Vulnerabilities: ${vulnerabilities} (threshold: ${thresholds.vulnerabilities})`);
    if (codeSmells > thresholds.codeSmells) violations.push(`Code Smells: ${codeSmells} (threshold: ${thresholds.codeSmells})`);
    if (coverage < thresholds.coverageMin) violations.push(`Coverage: ${coverage.toFixed(1)}% (minimum: ${thresholds.coverageMin}%)`);
    if (duplicatedLines > thresholds.duplicatedLinesMax) violations.push(`Duplicated Lines: ${duplicatedLines.toFixed(1)}% (max: ${thresholds.duplicatedLinesMax}%)`);

    const blockerCount = Math.floor(seededRandom(7) * 2);
    const criticalCount = Math.floor(seededRandom(8) * 3);
    const majorCount = Math.floor(seededRandom(9) * 8);
    const minorCount = Math.floor(seededRandom(10) * 15);

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
        technicalDebt: { value: `${Math.floor(seededRandom(11) * 4)}h ${Math.floor(seededRandom(12) * 60)}min`, threshold: 0, exceeded: false },
      },
      issuesSummary: {
        bySeverity: {
          blocker: { count: blockerCount, threshold: thresholds.blockerIssues, exceeded: blockerCount > thresholds.blockerIssues },
          critical: { count: criticalCount, threshold: thresholds.criticalIssues, exceeded: criticalCount > thresholds.criticalIssues },
          major: { count: majorCount, threshold: 10, exceeded: false },
          minor: { count: minorCount, threshold: 20, exceeded: false },
          info: { count: Math.floor(seededRandom(13) * 5), threshold: 100, exceeded: false },
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

  return {
    thresholds,
    setThresholds,
    analyzePR,
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