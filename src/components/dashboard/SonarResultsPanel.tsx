import { SonarQubeResults } from '@/types/codeReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bug, 
  Shield, 
  Code, 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  FileCode,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface SonarResultsPanelProps {
  results: SonarQubeResults | null;
  isAnalyzing: boolean;
  progress: number;
}

export function SonarResultsPanel({ results, isAnalyzing, progress }: SonarResultsPanelProps) {
  if (isAnalyzing) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="relative w-24 h-24 mb-4">
            <svg className="animate-spin" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted opacity-20"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${progress * 2.51} 251`}
                strokeLinecap="round"
                className="text-primary"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
              {progress}%
            </span>
          </div>
          <p className="text-muted-foreground">Analyzing code quality...</p>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a PR and run analysis to see SonarQube results</p>
        </CardContent>
      </Card>
    );
  }

  const copyAsJson = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    toast({
      title: "Copied",
      description: "Results copied to clipboard as JSON",
    });
  };

  const getSeverityClass = (severity: string) => {
    const classes: Record<string, string> = {
      BLOCKER: 'severity-blocker',
      CRITICAL: 'severity-critical',
      MAJOR: 'severity-major',
      MINOR: 'severity-minor',
      INFO: 'severity-info',
    };
    return classes[severity] || 'severity-info';
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              SonarQube Analysis
              <Badge 
                variant={results.qualityGate.status === 'OK' ? 'default' : 'destructive'}
                className="ml-2"
              >
                {results.qualityGate.status === 'OK' ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Passed</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                )}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3" />
              Scan completed in {results.scanMetadata.scanDuration}s
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyAsJson}>
            <Copy className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard
                icon={<Bug className="h-4 w-4" />}
                label="Bugs"
                value={results.metrics.bugs.value}
                exceeded={results.metrics.bugs.exceeded}
                threshold={results.metrics.bugs.threshold}
              />
              <MetricCard
                icon={<Shield className="h-4 w-4" />}
                label="Vulnerabilities"
                value={results.metrics.vulnerabilities.value}
                exceeded={results.metrics.vulnerabilities.exceeded}
                threshold={results.metrics.vulnerabilities.threshold}
              />
              <MetricCard
                icon={<Code className="h-4 w-4" />}
                label="Code Smells"
                value={results.metrics.codeSmells.value}
                exceeded={results.metrics.codeSmells.exceeded}
                threshold={results.metrics.codeSmells.threshold}
              />
              <MetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Coverage"
                value={`${results.metrics.coverage.value}%`}
                exceeded={results.metrics.coverage.exceeded}
                threshold={`${results.metrics.coverage.threshold}%`}
                inverse
              />
              <MetricCard
                icon={<Copy className="h-4 w-4" />}
                label="Duplications"
                value={`${results.metrics.duplicatedLinesDensity.value}%`}
                exceeded={results.metrics.duplicatedLinesDensity.exceeded}
                threshold={`${results.metrics.duplicatedLinesDensity.threshold}%`}
              />
              <MetricCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Hotspots"
                value={results.metrics.securityHotspots.value}
                exceeded={results.metrics.securityHotspots.exceeded}
                threshold={results.metrics.securityHotspots.threshold}
              />
            </div>

            {/* Severity Breakdown */}
            <Card className="bg-muted/30">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Issues by Severity</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge className="severity-badge severity-blocker">
                    Blocker: {results.issuesSummary.bySeverity.blocker.count}
                  </Badge>
                  <Badge className="severity-badge severity-critical">
                    Critical: {results.issuesSummary.bySeverity.critical.count}
                  </Badge>
                  <Badge className="severity-badge severity-major">
                    Major: {results.issuesSummary.bySeverity.major.count}
                  </Badge>
                  <Badge className="severity-badge severity-minor">
                    Minor: {results.issuesSummary.bySeverity.minor.count}
                  </Badge>
                  <Badge className="severity-badge severity-info">
                    Info: {results.issuesSummary.bySeverity.info.count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {results.issuesDetailed.map((issue, idx) => (
                  <div
                    key={issue.key}
                    className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Badge className={`severity-badge ${getSeverityClass(issue.severity)}`}>
                        {issue.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{issue.message}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileCode className="h-3 w-3" />
                            {issue.component.split('/').pop()}
                          </span>
                          {issue.line && <span>Line {issue.line}</span>}
                          <span className="font-mono">{issue.rule}</span>
                          {issue.effort && <span>{issue.effort}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {issue.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="thresholds" className="mt-4">
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${results.thresholdCheck.exceeded ? 'border-destructive bg-destructive/5' : 'border-success bg-success/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {results.thresholdCheck.exceeded ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  <span className="font-medium">
                    {results.thresholdCheck.exceeded ? 'Threshold Violations Detected' : 'All Thresholds Passed'}
                  </span>
                </div>
                {results.thresholdCheck.violations.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {results.thresholdCheck.violations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {results.qualityGate.conditions.map((condition, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-card/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">
                        {condition.metric.replace(/_/g, ' ')}
                      </span>
                      {condition.status === 'OK' ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Value: {condition.value} | Threshold: {condition.errorThreshold}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <ScrollArea className="h-[400px]">
              <pre className="code-block text-xs overflow-x-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  exceeded: boolean;
  threshold: string | number;
  inverse?: boolean;
}

function MetricCard({ icon, label, value, exceeded, threshold, inverse }: MetricCardProps) {
  return (
    <div className={`p-3 rounded-lg border ${exceeded ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card/50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={exceeded ? 'text-destructive' : 'text-muted-foreground'}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xl font-bold ${exceeded ? 'text-destructive' : ''}`}>{value}</span>
        <span className="text-xs text-muted-foreground">
          {inverse ? 'min' : 'max'}: {threshold}
        </span>
      </div>
      {exceeded && (
        <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Threshold exceeded
        </div>
      )}
    </div>
  );
}