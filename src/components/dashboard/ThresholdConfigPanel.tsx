import { ThresholdConfig, DEFAULT_THRESHOLDS } from '@/types/codeReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings, RotateCcw, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface ThresholdConfigPanelProps {
  thresholds: ThresholdConfig;
  onSave: (thresholds: ThresholdConfig) => void;
}

export function ThresholdConfigPanel({ thresholds, onSave }: ThresholdConfigPanelProps) {
  const [localThresholds, setLocalThresholds] = useState<ThresholdConfig>(thresholds);

  useEffect(() => {
    setLocalThresholds(thresholds);
  }, [thresholds]);

  const handleSave = () => {
    onSave(localThresholds);
    toast({
      title: "Thresholds Saved",
      description: "Quality gate thresholds have been updated.",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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