import { useState } from 'react';
import { GitHubConfig } from '@/types/codeReview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface GitHubConfigPanelProps {
  config: GitHubConfig | null;
  onSave: (config: GitHubConfig) => void;
  onTest: () => Promise<boolean>;
  isLoading: boolean;
}

export function GitHubConfigPanel({ config, onSave, onTest, isLoading }: GitHubConfigPanelProps) {
  const [token, setToken] = useState(config?.token || '');
  const [owner, setOwner] = useState(config?.owner || '');
  const [repo, setRepo] = useState(config?.repo || '');
  const [webhookSecret, setWebhookSecret] = useState(config?.webhookSecret || '');
  const [showToken, setShowToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = () => {
    onSave({ token, owner, repo, webhookSecret });
  };

  const handleTest = async () => {
    onSave({ token, owner, repo, webhookSecret });
    const success = await onTest();
    setConnectionStatus(success ? 'success' : 'error');
  };

  const parseRepoUrl = (url: string) => {
    const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
    if (match) {
      setOwner(match[1]);
      setRepo(match[2].replace('.git', ''));
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Configuration
        </CardTitle>
        <CardDescription>
          Connect your GitHub repository to fetch and review pull requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="repo-url">Repository URL (optional)</Label>
          <Input
            id="repo-url"
            placeholder="https://github.com/owner/repo"
            onChange={(e) => parseRepoUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Paste a GitHub URL to auto-fill owner and repo
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="owner">Owner / Organization</Label>
            <Input
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="owner"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo">Repository</Label>
            <Input
              id="repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="repository"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Personal Access Token</Label>
          <div className="relative">
            <Input
              id="token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Requires <code className="text-primary">repo</code> scope for private repositories
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-secret">Webhook Secret (optional)</Label>
          <Input
            id="webhook-secret"
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="optional - for webhook verification"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleTest} disabled={!token || !owner || !repo || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={!token || !owner || !repo}>
            Save Configuration
          </Button>
          
          {connectionStatus === 'success' && (
            <div className="flex items-center gap-1 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Connected
            </div>
          )}
          {connectionStatus === 'error' && (
            <div className="flex items-center gap-1 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              Connection failed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}