import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  GitMerge, 
  Sparkles, 
  FileCode, 
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { ConflictFile, ConflictResolution, MergeStrategy, MergeabilityStatus } from '@/hooks/useMergeConflict';
import { AIConfig } from '@/types/codeReview';

interface MergeConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mergeabilityStatus: MergeabilityStatus | null;
  conflictFiles: ConflictFile[];
  onAnalyzeWithAI: (file: ConflictFile) => Promise<string | null>;
  onResolve: (resolution: ConflictResolution) => Promise<boolean>;
  onMerge: (strategy: MergeStrategy) => Promise<void>;
  aiConfig: AIConfig;
  isLoading?: boolean;
}

export function MergeConflictDialog({
  open,
  onOpenChange,
  mergeabilityStatus,
  conflictFiles,
  onAnalyzeWithAI,
  onResolve,
  onMerge,
  aiConfig,
  isLoading,
}: MergeConflictDialogProps) {
  const [selectedFile, setSelectedFile] = useState<ConflictFile | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [resolvedFiles, setResolvedFiles] = useState<Set<string>>(new Set());
  const [manualContent, setManualContent] = useState<string>('');

  const handleAnalyzeWithAI = async (file: ConflictFile) => {
    setIsAnalyzing(file.filename);
    const analysis = await onAnalyzeWithAI(file);
    if (analysis) {
      setAIAnalysis(prev => ({ ...prev, [file.filename]: analysis }));
    }
    setIsAnalyzing(null);
  };

  const handleResolve = async (file: ConflictFile, strategy: 'ours' | 'theirs' | 'manual' | 'ai_assisted') => {
    let resolvedContent = '';
    
    if (strategy === 'manual') {
      resolvedContent = manualContent;
    } else if (strategy === 'ai_assisted' && aiAnalysis[file.filename]) {
      try {
        const parsed = JSON.parse(aiAnalysis[file.filename]);
        resolvedContent = parsed.resolvedContent || '';
      } catch {
        resolvedContent = '';
      }
    }

    const success = await onResolve({
      filename: file.filename,
      strategy,
      resolvedContent,
      aiAnalysis: aiAnalysis[file.filename],
    });

    if (success) {
      setResolvedFiles(prev => new Set([...prev, file.filename]));
    }
  };

  const parseAIAnalysis = (analysis: string) => {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = analysis.match(/```json\s*([\s\S]*?)\s*```/) || 
                        analysis.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, analysis];
      return JSON.parse(jsonMatch[1] || analysis);
    } catch {
      return null;
    }
  };

  const allResolved = conflictFiles.length > 0 && 
    conflictFiles.every(f => resolvedFiles.has(f.filename));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Merge Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            This pull request has merge conflicts that need to be resolved before merging.
          </DialogDescription>
        </DialogHeader>

        {/* Mergeability Status Summary */}
        {mergeabilityStatus && (
          <Card className="mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {mergeabilityStatus.mergeable ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                Merge Status: {mergeabilityStatus.mergeableState}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-2 text-sm">
                {mergeabilityStatus.blockedBy.map((reason, i) => (
                  <Badge key={i} variant="destructive">{reason}</Badge>
                ))}
                {mergeabilityStatus.behindBy > 0 && (
                  <Badge variant="secondary">
                    {mergeabilityStatus.behindBy} commits behind
                  </Badge>
                )}
                {mergeabilityStatus.aheadBy > 0 && (
                  <Badge variant="outline">
                    {mergeabilityStatus.aheadBy} commits ahead
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="strategy" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="strategy" className="gap-2">
              <GitMerge className="h-4 w-4" />
              Merge Strategy
            </TabsTrigger>
            <TabsTrigger value="ai-resolve" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI-Assisted Resolution
            </TabsTrigger>
          </TabsList>

          {/* Merge Strategy Tab */}
          <TabsContent value="strategy" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a merge strategy to handle the conflicts:
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onMerge('ours')}
                >
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Keep Ours</CardTitle>
                    <CardDescription className="text-xs">
                      Keep changes from the current branch
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onMerge('theirs')}
                >
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Keep Theirs</CardTitle>
                    <CardDescription className="text-xs">
                      Accept changes from the target branch
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onMerge('merge')}
                >
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Merge Commit</CardTitle>
                    <CardDescription className="text-xs">
                      Create a merge commit preserving history
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onMerge('squash')}
                >
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Squash Merge</CardTitle>
                    <CardDescription className="text-xs">
                      Combine all commits into one
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Conflicting Files ({conflictFiles.length})</h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {conflictFiles.map((file) => (
                      <div 
                        key={file.filename}
                        className="flex items-center justify-between text-sm p-2 rounded bg-background"
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-xs">{file.filename}</span>
                          {file.hasBusinessLogic && (
                            <Badge variant="secondary" className="text-xs">
                              Business Logic
                            </Badge>
                          )}
                        </div>
                        {resolvedFiles.has(file.filename) && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* AI-Assisted Resolution Tab */}
          <TabsContent value="ai-resolve" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use AI to analyze and resolve conflicts that don't involve business logic:
              </p>

              {!aiConfig.apiKey && (
                <Card className="border-yellow-500/50 bg-yellow-500/10">
                  <CardContent className="py-3">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Configure your AI API key in Settings to use AI-assisted conflict resolution.
                    </p>
                  </CardContent>
                </Card>
              )}

              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {conflictFiles.map((file) => {
                    const analysis = aiAnalysis[file.filename];
                    const parsed = analysis ? parseAIAnalysis(analysis) : null;
                    const isResolved = resolvedFiles.has(file.filename);

                    return (
                      <Card key={file.filename} className={isResolved ? 'border-green-500/50' : ''}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-mono flex items-center gap-2">
                              <FileCode className="h-4 w-4" />
                              {file.filename}
                              {file.hasBusinessLogic && (
                                <Badge variant="destructive" className="text-xs">
                                  Business Logic
                                </Badge>
                              )}
                            </CardTitle>
                            {isResolved ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAnalyzeWithAI(file)}
                                disabled={!aiConfig.apiKey || isAnalyzing === file.filename}
                              >
                                {isAnalyzing === file.filename ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Analyze with AI
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardHeader>

                        {parsed && !isResolved && (
                          <CardContent className="py-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Type: </span>
                                <Badge variant="secondary">{parsed.conflictType}</Badge>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Recommendation: </span>
                                <Badge variant={parsed.canAutoResolve ? 'default' : 'destructive'}>
                                  {parsed.recommendation}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {parsed.reasoning}
                            </p>

                            {parsed.canAutoResolve && !file.hasBusinessLogic ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleResolve(file, 'ai_assisted')}
                                  className="gap-1"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Apply AI Resolution
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-destructive">
                                  This conflict requires manual resolution due to business logic.
                                </p>
                                <Textarea
                                  placeholder="Enter the resolved content manually..."
                                  value={manualContent}
                                  onChange={(e) => setManualContent(e.target.value)}
                                  className="font-mono text-xs h-32"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResolve(file, 'ours')}
                                  >
                                    Keep Ours
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResolve(file, 'theirs')}
                                  >
                                    Keep Theirs
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleResolve(file, 'manual')}
                                    disabled={!manualContent}
                                  >
                                    Apply Manual Resolution
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {resolvedFiles.size} of {conflictFiles.length} files resolved
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => onMerge('merge')}
              disabled={!allResolved && conflictFiles.length > 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <GitMerge className="h-4 w-4 mr-2" />
                  Merge PR
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
