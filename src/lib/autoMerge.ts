export type AutoMergeMode = 'less' | 'greater';

export interface AutoMergeConfig {
  enabled: boolean;
  mode: AutoMergeMode;
  aiThreshold: number; // 0-100
  sonarThreshold: number; // number of issues
}

export function shouldAutoMerge(aiScore: number, sonarIssues: number, cfg: AutoMergeConfig): boolean {
  if (!cfg.enabled) return false;
  const mode = cfg.mode || 'less';
  if (mode === 'less') {
    // simpler inclusive comparison: auto-merge when both scores are <= thresholds
    return aiScore <= cfg.aiThreshold && sonarIssues <= cfg.sonarThreshold;
  }
  // 'greater' mode uses >= for simplicity
  return aiScore >= cfg.aiThreshold && sonarIssues >= cfg.sonarThreshold;
}

export function decisionReason(aiScore: number, sonarIssues: number, cfg: AutoMergeConfig): string {
  if (!cfg.enabled) return 'Auto-merge disabled';
  const mode = cfg.mode || 'less';
  if (mode === 'less') {
    const aiOk = aiScore <= cfg.aiThreshold;
    const sonarOk = sonarIssues <= cfg.sonarThreshold;
    return `Mode=less, aiScore=${aiScore} <= ${cfg.aiThreshold} => ${aiOk}, sonarIssues=${sonarIssues} <= ${cfg.sonarThreshold} => ${sonarOk}`;
  }
  const aiOk = aiScore >= cfg.aiThreshold;
  const sonarOk = sonarIssues >= cfg.sonarThreshold;
  return `Mode=greater, aiScore=${aiScore} >= ${cfg.aiThreshold} => ${aiOk}, sonarIssues=${sonarIssues} >= ${cfg.sonarThreshold} => ${sonarOk}`;
}
