import { useState, useEffect } from 'react';
import { AIConfig, AIProvider, AI_MODELS, DEFAULT_AI_CONFIG } from '@/types/codeReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Eye, EyeOff, Save, CheckCircle, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AIConfigPanelProps {
  config: AIConfig;
  onSave: (config: AIConfig) => void;
}

export function AIConfigPanel({ config, onSave }: AIConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<AIConfig>(config);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleProviderChange = (provider: AIProvider) => {
    const models = AI_MODELS[provider];
    setLocalConfig({
      ...localConfig,
      provider,
      model: models[0],
    });
  };

  const handleSave = () => {
    onSave(localConfig);
    toast({
      title: "AI Configuration Saved",
      description: `Using ${localConfig.provider} with model ${localConfig.model}`,
    });
  };

  const handleTestConnection = async () => {
    if (!localConfig.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key first",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      // Test the API connection based on provider
      const endpoint = getProviderEndpoint(localConfig.provider);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localConfig.apiKey}`,
          ...(localConfig.provider === 'anthropic' && { 'x-api-key': localConfig.apiKey, 'anthropic-version': '2023-06-01' }),
        },
        body: JSON.stringify(getTestPayload(localConfig)),
      });

      if (response.ok) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${localConfig.provider}`,
        });
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API returned ${response.status}`);
      }
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
          <Bot className="h-5 w-5 text-primary" />
          AI Configuration
        </CardTitle>
        <CardDescription>
          Configure your AI provider for code reviews
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Provider Configuration */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>AI Provider</Label>
            <Select
              value={localConfig.provider}
              onValueChange={(v) => handleProviderChange(v as AIProvider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google AI</SelectItem>
                <SelectItem value="groq">Groq (Free Tier)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={localConfig.model}
              onValueChange={(v) => setLocalConfig({ ...localConfig, model: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS[localConfig.provider].map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={localConfig.apiKey}
                onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                placeholder={`Enter your ${localConfig.provider} API key`}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {localConfig.provider === 'groq' 
                ? "Groq offers free tier - Get key at console.groq.com"
                : `Get your API key from ${getProviderUrl(localConfig.provider)}`
              }
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Post Reviews to GitHub</Label>
              <p className="text-xs text-muted-foreground">
                Post AI recommendations as PR comments
              </p>
            </div>
            <Switch
              checked={localConfig.postToGitHub}
              onCheckedChange={(v) => setLocalConfig({ ...localConfig, postToGitHub: v })}
            />
          </div>
        </div>

        {/* Status */}
        {localConfig.apiKey && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm">API key configured</span>
            <Badge variant="outline" className="ml-auto">
              {localConfig.provider}
            </Badge>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!localConfig.apiKey || isTesting}
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getProviderEndpoint(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    default:
      return '';
  }
}

function getProviderUrl(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'platform.openai.com';
    case 'anthropic':
      return 'console.anthropic.com';
    case 'google':
      return 'makersuite.google.com';
    case 'groq':
      return 'console.groq.com';
    default:
      return '';
  }
}

function getTestPayload(config: AIConfig) {
  if (config.provider === 'anthropic') {
    return {
      model: config.model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    };
  }
  return {
    model: config.model,
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 10,
  };
}