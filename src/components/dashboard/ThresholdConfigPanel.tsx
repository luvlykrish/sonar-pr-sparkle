import { ThresholdConfig, DEFAULT_THRESHOLDS, AIConfig } from '@/types/codeReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, RotateCcw, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface ThresholdConfigPanelProps {
  thresholds: ThresholdConfig;
  onSave: (thresholds: ThresholdConfig) => void;
  aiConfig?: AIConfig;
  onAIConfigSave?: (config: AIConfig) => void;
}

export function ThresholdConfigPanel({ thresholds, onSave, aiConfig, onAIConfigSave }: ThresholdConfigPanelProps) {
  const [localThresholds, setLocalThresholds] = useState<ThresholdConfig>(thresholds);
  const [localAIConfig, setLocalAIConfig] = useState<AIConfig | undefined>(aiConfig);

  useEffect(() => {
    setLocalThresholds(thresholds);
    setLocalAIConfig(aiConfig);
  }, [thresholds, aiConfig]);

  const handleSave = () => {
    onSave(localThresholds);
    if (localAIConfig && onAIConfigSave) {
      onAIConfigSave(localAIConfig);
    }
    toast({
      title: "Settings Saved",
      description: "Quality gate thresholds and auto-merge settings have been updated.",
    });
  };

  const handleReset = () => {
    setLocalThresholds(DEFAULT_THRESHOLDS);
    toast({
      title: "Thresholds Reset",
      description: "Quality gate thresholds have been reset to defaults.",
    });
  };

  const updateThreshold = (key: keyof ThresholdConfig, value: number) => {
    setLocalThresholds(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Quality Gate Thresholds
        </CardTitle>
        <CardDescription>
          Configure thresholds for SonarQube quality gate checks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-Merge Quality Gate Settings */}
        {localAIConfig && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/20 border border-border">
            <h3 className="text-sm font-semibold text-foreground">Auto-Merge Quality Gate</h3>
            
            {/* Enable Auto-Merge & JUnit Toggles */}
            <div className="space-y-3 border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto-Merge</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-merge based on configurable AI & Sonar thresholds
                  </p>
                </div>
                <Switch
                  checked={localAIConfig.autoMergeEnabled}
                  onCheckedChange={(v) => setLocalAIConfig({ ...localAIConfig, autoMergeEnabled: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require JUnit for Java</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-merge PRs with Java files requires JUnit threshold met
                  </p>
                </div>
                <Switch
                  checked={!!localAIConfig.requireJUnitForJava}
                  onCheckedChange={(v) => setLocalAIConfig({ ...localAIConfig, requireJUnitForJava: v })}
                />
              </div>

              {localAIConfig.requireJUnitForJava && (
                <div className="ml-4 space-y-2 p-3 rounded-lg bg-background/50 border border-border">
                  <Label>JUnit Threshold (0-100)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={localAIConfig.autoMergeThresholdJUnit ?? 70}
                    onChange={(e) => setLocalAIConfig({ ...localAIConfig, autoMergeThresholdJUnit: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Heuristic: 90 if tests found, 0 if Java but no tests</p>
                </div>
              )}
            </div>
            
            {/* Threshold Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Auto-Merge Mode</Label>
                <Select
                  value={localAIConfig.autoMergeMode || 'less'}
                  onValueChange={(v) => setLocalAIConfig({ ...localAIConfig, autoMergeMode: v as 'less' | 'greater' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less">Less (lower score = better)</SelectItem>
                    <SelectItem value="greater">Greater (higher score = better)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Determines how thresholds are evaluated</p>
              </div>

              <div className="space-y-2">
                <Label>AI Threshold (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={localAIConfig.autoMergeThresholdAI ?? 70}
                  onChange={(e) => setLocalAIConfig({ ...localAIConfig, autoMergeThresholdAI: Math.max(0, Math.min(100, Number(e.target.value))) })}
                />
                <p className="text-xs text-muted-foreground">AI review score threshold for auto-merge</p>
              </div>

              <div className="space-y-2">
                <Label>Sonar Issues Threshold</Label>
                <Input
                  type="number"
                  min={0}
                  value={localAIConfig.autoMergeThresholdSonar ?? 5}
                  onChange={(e) => setLocalAIConfig({ ...localAIConfig, autoMergeThresholdSonar: Math.max(0, Number(e.target.value)) })}
                />
                <p className="text-xs text-muted-foreground">Maximum Sonar issues allowed for auto-merge</p>
              </div>
            </div>
          </div>
        )}

        {/* SonarQube Thresholds */}
        <div>
          <h3 className="text-sm font-semibold mb-4 text-foreground">SonarQube Metrics</h3>
          {/* Bugs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum Bugs</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.bugs}</span>
            </div>
            <Slider
              value={[localThresholds.bugs]}
              onValueChange={([v]) => updateThreshold('bugs', v)}
              max={10}
              step={1}
            />
          </div>

          {/* Vulnerabilities */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum Vulnerabilities</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.vulnerabilities}</span>
            </div>
            <Slider
              value={[localThresholds.vulnerabilities]}
              onValueChange={([v]) => updateThreshold('vulnerabilities', v)}
              max={10}
              step={1}
            />
          </div>

          {/* Code Smells */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum Code Smells</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.codeSmells}</span>
            </div>
            <Slider
              value={[localThresholds.codeSmells]}
              onValueChange={([v]) => updateThreshold('codeSmells', v)}
              max={50}
              step={1}
            />
          </div>

          {/* Security Hotspots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum Security Hotspots</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.securityHotspots}</span>
            </div>
            <Slider
              value={[localThresholds.securityHotspots]}
              onValueChange={([v]) => updateThreshold('securityHotspots', v)}
              max={10}
              step={1}
            />
          </div>

          {/* Coverage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Minimum Coverage %</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.coverageMin}%</span>
            </div>
            <Slider
              value={[localThresholds.coverageMin]}
              onValueChange={([v]) => updateThreshold('coverageMin', v)}
              max={100}
              step={5}
            />
          </div>

          {/* Duplicated Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum Duplication %</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.duplicatedLinesMax}%</span>
            </div>
            <Slider
              value={[localThresholds.duplicatedLinesMax]}
              onValueChange={([v]) => updateThreshold('duplicatedLinesMax', v)}
              max={20}
              step={1}
            />
          </div>

          {/* Blocker Issues */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum Blocker Issues</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.blockerIssues}</span>
            </div>
            <Slider
              value={[localThresholds.blockerIssues]}
              onValueChange={([v]) => updateThreshold('blockerIssues', v)}
              max={5}
              step={1}
            />
          </div>

          {/* Critical Issues */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum Critical Issues</Label>
              <span className="text-sm font-mono text-muted-foreground">{localThresholds.criticalIssues}</span>
            </div>
            <Slider
              value={[localThresholds.criticalIssues]}
              onValueChange={([v]) => updateThreshold('criticalIssues', v)}
              max={10}
              step={1}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Thresholds
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}