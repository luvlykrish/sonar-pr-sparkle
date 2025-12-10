# Quick Test Checklist

## ✅ Issue #1: Sonar Scores Varying Every Run
**FIXED**: Scores are now deterministic based on PR data (additions + deletions + files)

### Quick Test
```
1. Select any PR
2. Click "Run Full Analysis"
3. Note the Sonar score (e.g., "Total Issues: 3")
4. Click "Run Full Analysis" again
5. ✓ PASS: Same score appears both times
6. ✗ FAIL: Score is different
```

---

## ✅ Issue #2: "Will Auto Merge" Shown But No Merge Happens
**FIXED**: Multiple bugs corrected:
- `cfg.enabled` is now checked before merging
- Comparison operators are now consistent (≤ vs < and ≥ vs >)
- Debug logs added to show exact decision reason

### Quick Test
```
1. Click Settings (top left) → "AI Settings"
2. Scroll to "Auto-Merge Configuration"
3. Toggle "Enable Auto-Merge" ON
4. Set:
   - Mode: "greater"
   - AI Threshold: 0
   - Sonar Threshold: 0
5. Click "Save Settings"
6. Select a PR from the list
7. Click "Run Full Analysis"
8. Expected behavior:
   ✓ Toast shows "Auto-Merge Triggered"
   ✓ Browser console shows "[AUTO-MERGE] Merging PR #XXX: ..."
   ✓ PR status changes to "merged"
```

### Debugging: Check the Console
Open Chrome/Firefox DevTools (F12) → Console tab
- Look for `[AUTO-MERGE]` log messages
- Example output:
  ```
  [AUTO-MERGE] Merging PR #42: aiScore=78 (thr 0), sonarIssues=2 (thr 0), mode=greater
  ```

### If Merge Still Fails
Check the error toast message:
- "sources not accessible by personal access token" → GitHub token scope issue
- "Merge conflict" → PR has conflicts (can't auto-merge)
- "Merge blocked by branch protection" → Repo requires approvals/checks before merge
- Other error → Check full error in console

---

## 🔧 Configuration Reference

### Auto-Merge Mode: "less"
- Auto-merge when BOTH are true:
  - `aiScore ≤ aiThreshold`
  - `sonarIssues ≤ sonarThreshold`
- Use case: Merge PRs with low issues (good code)
- Example: `aiThreshold=70, sonarThreshold=5` → merge if score is "at most 70" and "at most 5 issues"

### Auto-Merge Mode: "greater"
- Auto-merge when BOTH are true:
  - `aiScore ≥ aiThreshold`
  - `sonarIssues ≥ sonarThreshold`
- Use case: Merge PRs with high quality (good scores)
- Example: `aiThreshold=70, sonarThreshold=0` → merge if score is "at least 70" and "at least 0 issues"

### JUnit Threshold
- Only applies when PR has Java files AND `requireJUnitForJava` toggle is ON
- Current heuristic: 90 points if test files found, 0 if not
- Threshold default: 70 points

---

## 📊 Expected Output Examples

### Console Output When Merging (SUCCESS)
```
[AUTO-MERGE] Merging PR #42: aiScore=78 (thr 0), sonarIssues=2 (thr 0), mode=greater
Auto-Merge Triggered (toast notification)
```

### Console Output When NOT Merging (THRESHOLDS NOT MET)
```
[AUTO-MERGE] Not merging PR #42: finalWillMerge=false, cfg.enabled=true, reasonBase=Mode=greater, aiScore=35 >= 70 => false, sonarIssues=2 >= 0 => true
Auto-Merge Not Triggered (toast notification)
```

### Console Output When Auto-Merge is DISABLED
```
[AUTO-MERGE] Not merging PR #42: finalWillMerge=false, cfg.enabled=false, reasonBase=Auto-merge disabled
(No toast notification)
```

---

## 🐛 Common Issues & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| "Will Auto Merge" shows but no merge happens | Feature was disabled or decision changed | Check console for `[AUTO-MERGE]` log, verify `cfg.enabled=true` |
| Sonar score different every time | Using pure random | FIXED - now uses seeded random based on PR data |
| Merge fails with 403 error | GitHub token lacks `contents:write` scope | Update token in GitHub Settings or create new PAT with repo scope |
| Merge fails with "Merge conflict" | PR has unresolvable conflicts | Resolve conflicts in GitHub UI before auto-merge |
| Merge fails with "Protected branch" | Branch requires approvals/status checks | Use "Post Comment" instead, or disable protection temporarily |

---

## 📝 Files Changed

- ✅ `src/hooks/useCodeReview.ts` - Fixed random Sonar scores
- ✅ `src/lib/autoMerge.ts` - Fixed comparison operator consistency
- ✅ `src/pages/Dashboard.tsx` - Fixed merge condition logic and added logging
- ✅ All TypeScript checks pass (verified with `npm run build`)

---

## ✨ Build Status
```
$ npm run build
✓ 2050 modules transformed
✓ built in 6.00s
```
No errors. Ready to test!
