import { describe, it, expect } from 'vitest';
import { shouldAutoMerge } from '../src/lib/autoMerge';

describe('shouldAutoMerge', () => {
  it('returns false when disabled', () => {
    const cfg = { enabled: false, mode: 'less' as const, aiThreshold: 70, sonarThreshold: 5 };
    expect(shouldAutoMerge(50, 1, cfg)).toBe(false);
  });

  it('less mode: auto-merge when both less', () => {
  const cfg = { enabled: true, mode: 'less' as const, aiThreshold: 70, sonarThreshold: 5 };
    expect(shouldAutoMerge(60, 2, cfg)).toBe(true);
    expect(shouldAutoMerge(80, 2, cfg)).toBe(false); // ai too high
    expect(shouldAutoMerge(60, 10, cfg)).toBe(false); // sonar too many
  });

  it('greater mode: auto-merge when both greater', () => {
  const cfg = { enabled: true, mode: 'greater' as const, aiThreshold: 70, sonarThreshold: 5 };
    expect(shouldAutoMerge(80, 10, cfg)).toBe(true);
    expect(shouldAutoMerge(60, 10, cfg)).toBe(false);
    expect(shouldAutoMerge(80, 2, cfg)).toBe(false);
  });
});
