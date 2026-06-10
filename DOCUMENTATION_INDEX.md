# Baby & Mom App - Documentation Index

📚 Complete documentation created before clearing Vercel deployments.

## Quick Links

### 1. **SYSTEM_DOCUMENTATION.md** ⭐
   - System architecture and overview
   - Database structure (baby_metrics table)
   - Current data state (300ml formula + 0ml breastmilk)
   - All commands: FEED (✓ working), REPORT (✗ broken), APPT (✓ working)
   - Critical bug documentation with root cause analysis
   - Timezone requirements (CRITICAL: Europe/London)
   - Key constants and file structure

### 2. **BACKUP_SUMMARY.txt**
   - Quick status snapshot before cleanup
   - What's working vs broken
   - Database state verification
   - Deployment issues summary
   - Latest working commit reference
   - Next steps overview

### 3. **RECOVERY_CHECKLIST.md** 📋
   - Step-by-step recovery guide for Vercel cleanup
   - Dashboard navigation instructions
   - Fresh deployment triggering
   - Testing commands
   - Troubleshooting guide
   - Verification checklist

## Current Status

✅ **WORKING**
- Feed command: Shows 300ml correctly with 5 formula records
- Appointment command: Functional
- Metric logging: Working
- Database: Verified 300ml total (5 records: 90+90+30+30+60ml)

❌ **BROKEN**
- Report command: Shows 380ml instead of 300ml (80ml extra)
- Shows non-feed metrics (vaccine: 0, potty: 0, bath: 0)
- Root cause: Vercel deployment caching issue

## Critical Constraint

⚠️ **ALWAYS use Europe/London timezone in all functions**

This is EXPLICITLY documented and required because:
- User gave feedback about timezone issues
- Feed command depends on this
- DO NOT change without verifying timestamps

```javascript
const formatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/London'
});
```

## Before Clearing Deployments

1. ✅ Read SYSTEM_DOCUMENTATION.md
2. ✅ Review BACKUP_SUMMARY.txt
3. ✅ Print RECOVERY_CHECKLIST.md (for reference)
4. ✅ Verify git has all commits
5. ✅ Note working commit: 42a9e7e

## After Clearing and Redeploying

1. Test feed command (should show 300ml)
2. Verify times are in London timezone
3. Report command will still show wrong data (known bug)
4. Use feed as primary metric source
5. Document results in BACKUP_SUMMARY.txt

## Key Files

```
Project Files:
- app/api/whatsapp/route.ts (main POST handler)
- app/api/whatsapp/commands.ts (command handlers)
- lib/supabase.ts (Supabase client)

Documentation Files:
- SYSTEM_DOCUMENTATION.md
- BACKUP_SUMMARY.txt
- RECOVERY_CHECKLIST.md
- DOCUMENTATION_INDEX.md (this file)

Repository:
- GitHub: https://github.com/irishisinha/baby-and-mom-app.git
- Branch: main
```

## Known Issues

### Report Command (80ml Discrepancy)
- Shows: 380ml formula + 20ml breastmilk
- Should show: 300ml formula + 0ml breastmilk
- Database verified: 300ml total
- Root cause: Vercel caching - code changes don't deploy
- Status: Unresolved - requires manual Vercel dashboard intervention
- Impact: Low (feed command works correctly)
- Timeline: Can be fixed after deployments stabilized

## Testing Commands

```bash
# Test Feed (WORKING)
curl -s -X POST https://baby-and-mom-app.vercel.app/api/whatsapp \
  -d "Body=feed&From=%2B919604898762" \
  -H "Content-Type: application/x-www-form-urlencoded"
# Expected: Formula: 300ml with 5 records

# Test Report (BROKEN)
curl -s -X POST https://baby-and-mom-app.vercel.app/api/whatsapp \
  -d "Body=report&From=%2B919604898762" \
  -H "Content-Type: application/x-www-form-urlencoded"
# Actual: Shows 380ml (bug)
# Expected: Should show 300ml
```

## Database Constants

```
FAMILY_ID: df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6
BABY_ID: e8a7c56c-62c6-442c-94ac-518928c8c07b
AUTHORIZED_NUMBERS:
  - +919604898762
  - +919871319008
  - +919914789171
```

## Questions?

Refer to:
1. SYSTEM_DOCUMENTATION.md for architecture details
2. RECOVERY_CHECKLIST.md for deployment steps
3. BACKUP_SUMMARY.txt for current state

---

**Documentation Created:** 2026-06-10  
**For:** Rishi Sinha  
**Email:** rishisinhax@gmail.com  
**Status:** Complete backup before infrastructure changes
