import { useState, useEffect } from 'react';
import { JiraConfig, DEFAULT_JIRA_CONFIG } from '@/types/codeReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Ticket, Eye, EyeOff, Save, CheckCircle, Link2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
interface JiraConfigPanelProps {
  config: JiraConfig;
  onSave: (config: JiraConfig) => void;
}

export function JiraConfigPanel({ config, onSave }: JiraConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<JiraConfig>(config);
  const [showApiToken, setShowApiToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onSave(localConfig);
    toast({
      title: "Jira Configuration Saved",
      description: `Connected to ${localConfig.domain}`,
    });
  };

  const handleTestConnection = async () => {
    if (!localConfig.apiToken || !localConfig.email || !localConfig.domain) {
      toast({
        title: "Configuration Required",
        description: "Please fill in domain, email, and API token",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('jira-proxy', {
        body: {
          action: 'test',
          domain: localConfig.domain,
          email: localConfig.email,
          apiToken: localConfig.apiToken,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Connection Successful",
        description: `Connected as ${data.displayName}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Jira Integration
        </CardTitle>
        <CardDescription>
          Connect Jira to validate code changes against business requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Jira Integration</Label>
            <p className="text-xs text-muted-foreground">
              Validate PR changes against Jira ticket requirements
            </p>
          </div>
          <Switch
            checked={localConfig.enabled}
            onCheckedChange={(v) => setLocalConfig({ ...localConfig, enabled: v })}
          />
        </div>

        {localConfig.enabled && (
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>Jira Domain</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">https://</span>
                <Input
                  value={localConfig.domain}
                  onChange={(e) => setLocalConfig({ ...localConfig, domain: e.target.value })}
                  placeholder="yoursite.atlassian.net"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={localConfig.email}
                onChange={(e) => setLocalConfig({ ...localConfig, email: e.target.value })}
                placeholder="your-email@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                API Token
              </Label>
              <div className="relative">
                <Input
                  type={showApiToken ? "text" : "password"}
                  value={localConfig.apiToken}
                  onChange={(e) => setLocalConfig({ ...localConfig, apiToken: e.target.value })}
                  placeholder="Enter your Jira API token"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiToken(!showApiToken)}
                >
                  {showApiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API token from id.atlassian.com/manage-profile/security/api-tokens
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-detect from PR</Label>
                <p className="text-xs text-muted-foreground">
                  Extract ticket ID from PR title/branch (e.g., PROJ-123)
                </p>
              </div>
              <Switch
                checked={localConfig.autoDetect}
                onCheckedChange={(v) => setLocalConfig({ ...localConfig, autoDetect: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>Project Key Pattern (optional)</Label>
              <Input
                value={localConfig.projectKeyPattern || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, projectKeyPattern: e.target.value })}
                placeholder="PROJ|FEAT|BUG (regex pattern)"
              />
              <p className="text-xs text-muted-foreground">
                Custom regex for ticket detection. Leave empty for default pattern.
              </p>
            </div>
          </div>
        )}

        {localConfig.enabled && localConfig.apiToken && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm">Jira configured</span>
            <Badge variant="outline" className="ml-auto">
              {localConfig.domain}
            </Badge>
          </div>
        )}

        {localConfig.enabled && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!localConfig.apiToken || !localConfig.email || isTesting}
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        )}

        {!localConfig.enabled && (
          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
