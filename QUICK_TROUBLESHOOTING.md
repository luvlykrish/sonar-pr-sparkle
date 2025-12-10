# Quick Troubleshooting: Why Auto-Merge Isn't Working

## 🎯 Immediate Action Items

### 1. Check Browser Console (F12)
Look for `[AUTO-MERGE]` messages. This will tell you **exactly** what happened.

#### Message: ✅ MERGING
```
[AUTO-MERGE] ✅ MERGING PR #42: cfg.enabled=true, finalWillMerge=true
```
→ Merge was attempted. If PR not merged, check GitHub PR status/protection rules.

#### Message: ❌ NOT MERGING
```
[AUTO-MERGE] ❌ NOT MERGING PR #42: cfg.enabled=true, finalWillMerge=false
→ Mode=greater, aiScore=35 >= 70 => false, sonarIssues=2 >= 0 => true
```
→ Thresholds not met. Check your settings:
- Is Mode set correctly? (`less` or `greater`)
- Are thresholds too strict?
- What are actual aiScore and sonarIssues values?

---

### 2. Verify Settings

#### Settings to Check:
- [ ] **Enable Auto-Merge** toggle is ON (not OFF)
- [ ] **Mode** is set correctly
  - `less` = merge when score IS LOW (good for low-issue code)
  - `greater` = merge when score IS HIGH (good for high-quality code)
- [ ] **AI Threshold**: 0-100 range, matches your expectations
- [ ] **Sonar Threshold**: 0+ issues, matches your expectations

#### Your Current Test Settings:
```
Mode: greater
AI Threshold: 0     (merge if AI score >= 0)
Sonar Threshold: 0  (merge if issues >= 0)
```
→ This should merge **almost always** (all scores are >=0)

If still not merging with these settings, the bug is **NOT in the logic** — it's likely:
1. **Auto-merge is disabled** (toggle is OFF)
2. **API error** (check toast for "Failed to Merge" message)
3. **GitHub PR state** (PR is draft, has conflicts, or blocked)

---

### 3. Check PR Auto-Merge History

In PR detail panel, look at **"Latest Auto-Merge Decision"**:

**Good Example** (should have merged):
```
Latest Auto-Merge Decision
Timestamp: Dec 6, 2024 12:34 PM
Decision: will_merge ✓
AI: 75 (thr 0) • Sonar: 2 (thr 0)
Mode=greater, aiScore=75 >= 0 => true, sonarIssues=2 >= 0 => true; cfgEnabled=true
```

**Bad Example** (should not have merged):
```
Latest Auto-Merge Decision
Timestamp: Dec 6, 2024 12:34 PM
Decision: will_not_merge ✗
AI: 35 (thr 70) • Sonar: 2 (thr 5)
Mode=greater, aiScore=35 >= 70 => false, sonarIssues=2 >= 5 => false; cfgEnabled=true
```

---

## 🔧 Common Issues & Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Console shows ❌ NOT MERGING | Thresholds not met | Lower the thresholds in settings |
| No console message at all | Auto-merge disabled | Toggle "Enable Auto-Merge" ON |
| Console shows ✅ MERGING but PR not merged | GitHub API error or PR state | Check toast error message, check PR can be merged |
| Sonar score different every time | Not using seeded random | This was fixed - should be consistent now |
| UI has excessive whitespace | Layout not compact | This was fixed - should be clean now |

---

## 📋 Workflow: Testing Auto-Merge

```
1. Go to Settings → AI Settings
2. Make sure "Enable Auto-Merge" is ON
3. Set reasonable thresholds:
   - Mode: greater
   - AI: 0 (low bar for testing)
   - Sonar: 0 (low bar for testing)
4. Click "Save Configuration"
5. Select a PR from the list
6. Click "Run Full Analysis"
7. Check results:
   - Does toast show "Auto-Merge Triggered"?
   - Does console show "[AUTO-MERGE] ✅ MERGING"?
   - Did PR get merged?
8. If not merged:
   - Check "Latest Auto-Merge Decision" in PR detail
   - Check GitHub PR can be merged (no conflicts, all checks pass)
   - Check GitHub token has repo write access
```

---

## 💻 Console Log Cheat Sheet

### What each field means:
- `cfg.enabled` = Is auto-merge feature turned ON?
- `finalWillMerge` = Do thresholds pass the test?
- `Mode=greater` = We're using the "greater than threshold" mode
- `aiScore=75 >= 0 => true` = AI score (75) is greater than or equal to threshold (0) → passes ✓
- `sonarIssues=2 >= 0 => true` = Sonar issues (2) is greater than or equal to threshold (0) → passes ✓

### Full example breakdown:
```
[AUTO-MERGE] ✅ MERGING PR #42: cfg.enabled=true, finalWillMerge=true
  → aiScore=75 (threshold 0), sonarIssues=2 (threshold 0), mode=greater
  → Mode=greater, aiScore=75 >= 0 => true, sonarIssues=2 >= 0 => true
```

Means:
- Auto-merge is enabled ✓
- Decision is to merge ✓
- AI gave score of 75 (threshold is 0) ✓
- Sonar found 2 issues (threshold is 0) ✓
- Mode is "greater" (>=) ✓
- All conditions met → **MERGING** ✓

---

## 🎬 If Nothing Works

### Step-by-step debug:
1. **Open DevTools Console** (F12) and look for `[AUTO-MERGE]` logs
2. **Screenshot the console** showing the message
3. **Check AI Settings** - screenshot the configuration
4. **Check PR detail** - screenshot the "Latest Auto-Merge Decision"
5. **Try manual merge** - click "Merge PR" button to test GitHub token
6. **Share these 4 items** with detailed explanation of what you expected vs. what happened

This will pinpoint exactly where the issue is.
