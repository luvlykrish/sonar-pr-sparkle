// Re-export from the new database-backed hook for backward compatibility
import { 
  getAutoMergeHistory, 
  saveAutoMergeHistory,
  AutoMergeHistoryEntry 
} from '@/hooks/useConfigDatabase';

export type { AutoMergeHistoryEntry };

export async function getHistory(prNumber: number): Promise<AutoMergeHistoryEntry[]> {
  return getAutoMergeHistory(prNumber);
}

export async function saveHistory(prNumber: number, entry: AutoMergeHistoryEntry): Promise<void> {
  await saveAutoMergeHistory(prNumber, entry);
}
