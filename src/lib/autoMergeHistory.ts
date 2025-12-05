export interface AutoMergeHistoryEntry {
  timestamp: string;
  aiScore: number;
  sonarIssues: number;
  mode: 'less' | 'greater';
  aiThreshold: number;
  sonarThreshold: number;
  decision: 'will_merge' | 'will_not_merge' | 'merged' | 'merge_failed' | 'disabled';
  details?: string;
}

const STORAGE_KEY = 'auto_merge_history_v1';

function readAll(): Record<string, AutoMergeHistoryEntry[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to read auto-merge history', e);
    return {};
  }
}

function writeAll(map: Record<string, AutoMergeHistoryEntry[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to write auto-merge history', e);
  }
}

export function getHistory(prNumber: number): AutoMergeHistoryEntry[] {
  const map = readAll();
  return map[String(prNumber)] || [];
}

export function saveHistory(prNumber: number, entry: AutoMergeHistoryEntry) {
  const map = readAll();
  const arr = map[String(prNumber)] || [];
  arr.unshift(entry); // newest first
  // keep last 20 entries
  map[String(prNumber)] = arr.slice(0, 20);
  writeAll(map);
}
