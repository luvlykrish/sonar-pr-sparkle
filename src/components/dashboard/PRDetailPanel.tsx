import { PullRequest, SonarQubeResults, AIReviewResult } from '@/types/codeReview';
import { useState, useEffect } from 'react';
import { getHistory, AutoMergeHistoryEntry } from '@/lib/autoMergeHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  GitPullRequest, 
  GitBranch, 
  Calendar, 
  FileCode, 
  Plus, 
  Minus,
  Play,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface PRDetailPanelProps {
  pr: PullRequest | null;
  sonarResults: SonarQubeResults | null;
  aiReview: AIReviewResult | null;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  config: { owner: string; repo: string } | null;
}

export function PRDetailPanel({ 
  pr, 
  sonarResults, 
  aiReview, 
  onRunAnalysis, 
  isAnalyzing,
  config 
}: PRDetailPanelProps) {
  const [history, setHistory] = useState<AutoMergeHistoryEntry[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (pr) {
        try {
          const data = await getHistory(pr.number);
          setHistory(data);
        } catch (e) {
          console.error('Failed to load auto-merge history', e);
          setHistory([]);
        }
      } else {
        setHistory([]);
      }
    };
    loadHistory();
  }, [pr]);
  if (!pr) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <GitPullRequest className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No Pull Request Selected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Select a PR from the list to view details and run analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (sonarResults) {
      if (sonarResults.qualityGate.status === 'OK' && (!sonarResults.thresholdCheck.exceeded)) {
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      }
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    return <AlertTriangle className="h-5 w-5 text-warning" />;
  };

  const getStatusLabel = () => {
    if (!sonarResults) return 'Not analyzed';
    if (sonarResults.qualityGate.status === 'OK' && !sonarResults.thresholdCheck.exceeded) {
      return 'All checks passed';
    }
    return `${sonarResults.thresholdCheck.violations.length} issues found`;
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitPullRequest className="h-5 w-5" />
              #{pr.number}
            </CardTitle>
            <h2 className="text-xl font-semibold">{pr.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm text-muted-foreground">{getStatusLabel()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Author & Dates */}
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={pr.authorAvatar} />
            <AvatarFallback>{pr.author[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{pr.author}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(pr.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <Separator />

        {/* Branch Info */}
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <code className="px-2 py-1 rounded bg-muted font-mono text-xs">{pr.head.ref}</code>
          <span className="text-muted-foreground">→</span>
          <code className="px-2 py-1 rounded bg-muted font-mono text-xs">{pr.base.ref}</code>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <FileCode className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{pr.changedFiles}</p>
            <p className="text-xs text-muted-foreground">Files</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <Plus className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-success">{pr.additions}</p>
            <p className="text-xs text-muted-foreground">Additions</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <div className="flex items-center justify-center gap-1 text-destructive mb-1">
              <Minus className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-destructive">{pr.deletions}</p>
            <p className="text-xs text-muted-foreground">Deletions</p>
          </div>
        </div>

        {/* Labels */}
        {pr.labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pr.labels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Description */}
        {pr.body && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {pr.body}
            </p>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {pr.state !== 'open' ? (
            <div className="flex-1 p-3 rounded-lg bg-muted/50 border border-muted flex items-center justify-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {pr.state === 'closed' ? 'Closed PRs cannot be analyzed' : 'Merged PRs cannot be analyzed'}
              </span>
            </div>
          ) : (
            <Button onClick={onRunAnalysis} disabled={isAnalyzing} className="flex-1">
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Full Analysis
                </>
              )}
            </Button>
          )}
          {config && (
            <Button variant="outline" asChild>
              <a
                href={`https://github.com/${config.owner}/${config.repo}/pull/${pr.number}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          )}
        </div>

        {/* Quick Stats from Analysis */}
        {(sonarResults || aiReview) && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {sonarResults && (
              <div className="p-3 rounded-lg border border-border bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">SonarQube</p>
                <div className="flex items-center gap-2">
                  {sonarResults.qualityGate.status === 'OK' ? (
                    <Badge variant="default" className="bg-success">Passed</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                  <span className="text-sm">{sonarResults.issuesSummary.total} issues</span>
                </div>
              </div>
            )}
            {aiReview && (
              <div className="p-3 rounded-lg border border-border bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">AI Review</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{aiReview.overallScore}/100</Badge>
                  <span className="text-sm">{aiReview.suggestions.length} suggestions</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto-merge decision history */}
        {history && history.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-medium mb-2">Latest Auto-Merge Decision</h3>
              {history.slice(0, 1).map((h) => (
                <div key={h.timestamp} className="p-3 rounded-lg border border-border bg-muted/20 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</div>
                    <div className="text-xs font-medium">{h.decision.replace('_', ' ')}</div>
                  </div>
                  <div className="mt-1 text-xs">
                    AI: {h.aiScore} (thr {h.aiThreshold}) • Sonar: {h.sonarIssues} (thr {h.sonarThreshold})
                  </div>
                  {h.details && <div className="mt-1 text-xs text-muted-foreground">{h.details}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}