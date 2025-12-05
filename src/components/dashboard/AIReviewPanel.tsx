import { useState } from 'react';
import { AIReviewResult, PullRequest, ReviewCommand } from '@/types/codeReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  FileText, 
  BookOpen, 
  Type, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  Loader2,
  Check,
  X,
  AlertCircle,
  Shield,
  Zap,
  Wrench,
  TestTube,
  Bot
} from 'lucide-react';

interface AIReviewPanelProps {
  pr: PullRequest | null;
  review: AIReviewResult | null;
  onGenerateReview: (command: ReviewCommand) => Promise<void>;
  isGenerating: boolean;
}

export function AIReviewPanel({ pr, review, onGenerateReview, isGenerating }: AIReviewPanelProps) {
  const [activeCommand, setActiveCommand] = useState<ReviewCommand['type'] | null>(null);

  const handleCommand = async (type: ReviewCommand['type']) => {
    if (!pr) return;
    setActiveCommand(type);
    await onGenerateReview({ type, prNumber: pr.number });
    setActiveCommand(null);
  };

  if (!pr) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a PR to generate AI-powered code review</p>
          <p className="text-sm text-muted-foreground mt-1">
            Uses OpenAI to analyze code quality, security, and suggest improvements
          </p>
        </CardContent>
      </Card>
    );
  }

  // Disable AI review for non-open PRs
  if (pr.state !== 'open') {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            AI Code Review
          </CardTitle>
          <CardDescription>
            Sourcery-style AI commands for PR #{pr.number}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">
            {pr.state === 'closed' ? 'Closed PRs cannot be reviewed' : 'Merged PRs cannot be reviewed'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            AI code review is only available for open pull requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Code Review
          {review && (
            <Badge variant="outline" className="ml-2">
              Score: {review.overallScore}/100
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Sourcery-style AI commands for PR #{pr.number}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Command Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCommand('review')}
            disabled={isGenerating}
          >
            {activeCommand === 'review' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            @ai review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCommand('summary')}
            disabled={isGenerating}
          >
            {activeCommand === 'summary' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            @ai summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCommand('guide')}
            disabled={isGenerating}
          >
            {activeCommand === 'guide' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="mr-2 h-4 w-4" />
            )}
            @ai guide
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCommand('title')}
            disabled={isGenerating}
          >
            {activeCommand === 'title' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Type className="mr-2 h-4 w-4" />
            )}
            @ai title
          </Button>
        </div>

        {isGenerating && !review && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing code with AI...</p>
          </div>
        )}

        {review && (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              <TabsTrigger value="guide">Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </h4>
                <p className="text-sm text-muted-foreground">{review.summary}</p>
              </div>
              
              {review.title && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Suggested Title
                  </h4>
                  <p className="text-sm font-mono bg-primary/10 px-3 py-2 rounded">
                    {review.title}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <span className="text-sm text-muted-foreground">
                  Generated by {review.model}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Was this helpful?</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scores" className="mt-4">
              <div className="space-y-4">
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  <div className="text-5xl font-bold text-gradient mb-2">
                    {review.overallScore}
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <ScoreBar
                    icon={<Wrench className="h-4 w-4" />}
                    label="Code Quality"
                    score={review.categories.codeQuality}
                  />
                  <ScoreBar
                    icon={<Shield className="h-4 w-4" />}
                    label="Security"
                    score={review.categories.security}
                  />
                  <ScoreBar
                    icon={<Zap className="h-4 w-4" />}
                    label="Performance"
                    score={review.categories.performance}
                  />
                  <ScoreBar
                    icon={<Wrench className="h-4 w-4" />}
                    label="Maintainability"
                    score={review.categories.maintainability}
                  />
                  <ScoreBar
                    icon={<TestTube className="h-4 w-4" />}
                    label="Testability"
                    score={review.categories.testability}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {review.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-4 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              suggestion.severity === 'critical' ? 'destructive' :
                              suggestion.severity === 'high' ? 'default' :
                              'secondary'
                            }
                          >
                            {suggestion.severity}
                          </Badge>
                          <Badge variant="outline">{suggestion.type}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-1">{suggestion.message}</p>
                      <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{suggestion.file}</span>
                        {suggestion.line && <span>Line {suggestion.line}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="guide" className="mt-4">
              {review.guide ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border whitespace-pre-wrap font-mono text-sm">
                    {review.guide}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click "@ai guide" to generate a review guide
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

interface ScoreBarProps {
  icon: React.ReactNode;
  label: string;
  score: number;
}

function ScoreBar({ icon, label, score }: ScoreBarProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-medium">{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}