import { useState, useEffect, useCallback } from 'react';
import { useGitHub } from '@/hooks/useGitHub';
import { useCodeReview } from '@/hooks/useCodeReview';
import { PullRequest, SonarQubeResults, AIReviewResult, ReviewCommand } from '@/types/codeReview';
import { GitHubConfigPanel } from '@/components/dashboard/GitHubConfigPanel';
import { PRList } from '@/components/dashboard/PRList';
import { PRDetailPanel } from '@/components/dashboard/PRDetailPanel';
import { SonarResultsPanel } from '@/components/dashboard/SonarResultsPanel';
import { AIReviewPanel } from '@/components/dashboard/AIReviewPanel';
import { ThresholdConfigPanel } from '@/components/dashboard/ThresholdConfigPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Github, 
  Shield, 
  Sparkles, 
  Moon, 
  Sun,
  Webhook,
  Code2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { 
    config, 
    setConfig, 
    pullRequests, 
    isLoading, 
    fetchPullRequests, 
    fetchPRFiles,
    testConnection 
  } = useGitHub();
  
  const { 
    thresholds, 
    setThresholds, 
    analyzePR, 
    generateAIReview, 
    mockSonarResults,
    isAnalyzing,
    analysisProgress 
  } = useCodeReview();

  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [sonarResults, setSonarResults] = useState<SonarQubeResults | null>(null);
  const [aiReview, setAIReview] = useState<AIReviewResult | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    if (config) {
      fetchPullRequests();
    }
  }, [config, fetchPullRequests]);

  const handleSelectPR = useCallback((pr: PullRequest) => {
    setSelectedPR(pr);
    setSonarResults(null);
    setAIReview(null);
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    if (!selectedPR) return;

    const files = await fetchPRFiles(selectedPR.number);
    await analyzePR(selectedPR, files);
    
    // Generate mock SonarQube results
    const results = mockSonarResults(selectedPR);
    setSonarResults(results);
    
    // Generate AI review
    setIsGeneratingAI(true);
    const review = await generateAIReview(selectedPR, { type: 'review', prNumber: selectedPR.number });
    setAIReview(review);
    setIsGeneratingAI(false);

    if (results.thresholdCheck.exceeded) {
      toast({
        title: "Quality Gate Failed",
        description: `${results.thresholdCheck.violations.length} threshold violations detected`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Quality Gate Passed",
        description: "All quality thresholds met",
      });
    }
  }, [selectedPR, fetchPRFiles, analyzePR, mockSonarResults, generateAIReview]);

  const handleGenerateAIReview = useCallback(async (command: ReviewCommand) => {
    if (!selectedPR) return;
    
    setIsGeneratingAI(true);
    const review = await generateAIReview(selectedPR, command);
    if (review) {
      setAIReview(prev => prev ? { ...prev, ...review } : review);
    }
    setIsGeneratingAI(false);
  }, [selectedPR, generateAIReview]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">
                <span className="text-gradient">CodeGate</span>
                <span className="text-muted-foreground font-normal ml-2">Review</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs defaultValue="review" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="review" className="gap-2">
              <Shield className="h-4 w-4" />
              Review
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhook
            </TabsTrigger>
          </TabsList>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-6">
            {!config ? (
              <div className="max-w-2xl mx-auto">
                <GitHubConfigPanel
                  config={config}
                  onSave={setConfig}
                  onTest={testConnection}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-6">
                {/* PR List - Left Sidebar */}
                <div className="col-span-12 lg:col-span-3 h-[calc(100vh-12rem)]">
                  <PRList
                    pullRequests={pullRequests}
                    selectedPR={selectedPR}
                    onSelectPR={handleSelectPR}
                    onRefresh={fetchPullRequests}
                    isLoading={isLoading}
                  />
                </div>

                {/* Main Content Area */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                  {/* PR Details */}
                  <PRDetailPanel
                    pr={selectedPR}
                    sonarResults={sonarResults}
                    aiReview={aiReview}
                    onRunAnalysis={handleRunAnalysis}
                    isAnalyzing={isAnalyzing}
                    config={config}
                  />

                  {/* Analysis Results - Two Column Layout */}
                  {selectedPR && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <SonarResultsPanel
                        results={sonarResults}
                        isAnalyzing={isAnalyzing}
                        progress={analysisProgress}
                      />
                      <AIReviewPanel
                        pr={selectedPR}
                        review={aiReview}
                        onGenerateReview={handleGenerateAIReview}
                        isGenerating={isGeneratingAI}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GitHubConfigPanel
                config={config}
                onSave={setConfig}
                onTest={testConnection}
                isLoading={isLoading}
              />
              <ThresholdConfigPanel
                thresholds={thresholds}
                onSave={setThresholds}
              />
            </div>
          </TabsContent>

          {/* Webhook Tab */}
          <TabsContent value="webhook" className="space-y-6">
            <WebhookInfoPanel config={config} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function WebhookInfoPanel({ config }: { config: { owner: string; repo: string; webhookSecret?: string } | null }) {
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhook/github` 
    : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="glass-card p-6 rounded-lg">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Webhook className="h-5 w-5" />
          GitHub Webhook Setup
        </h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">1. Webhook URL</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm">
                {webhookUrl}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookUrl)}>
                Copy
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">2. Content Type</h3>
            <code className="block p-3 rounded-lg bg-muted font-mono text-sm">
              application/json
            </code>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">3. Events to Subscribe</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Pull requests</li>
              <li>Pull request reviews</li>
              <li>Pull request review comments</li>
              <li>Issue comments (for @ai commands)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">4. Secret</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {config?.webhookSecret 
                ? "Webhook secret is configured. Use the same secret in GitHub."
                : "Configure a webhook secret in Settings for secure webhook verification."}
            </p>
          </div>

          {config && (
            <div className="pt-4 border-t border-border">
              <Button asChild>
                <a
                  href={`https://github.com/${config.owner}/${config.repo}/settings/hooks/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Configure Webhook on GitHub
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-6 rounded-lg">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5" />
          OpenAI Integration (Coming Soon)
        </h2>
        <p className="text-muted-foreground">
          The AI code review feature currently uses mock data. To enable real AI-powered reviews:
        </p>
        <ol className="list-decimal list-inside text-sm text-muted-foreground mt-3 space-y-2">
          <li>Enable Lovable Cloud to access edge functions</li>
          <li>Configure OpenAI API key in secrets</li>
          <li>The edge function will power real-time AI code analysis</li>
        </ol>
      </div>
    </div>
  );
}