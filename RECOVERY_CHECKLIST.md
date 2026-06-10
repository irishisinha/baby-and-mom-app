# Vercel Recovery Checklist

Use this checklist when clearing Vercel deployments and redeploying.

## Before You Start
- [ ] Read SYSTEM_DOCUMENTATION.md
- [ ] Read BACKUP_SUMMARY.txt
- [ ] Have GitHub repo link ready: https://github.com/irishisinha/baby-and-mom-app.git
- [ ] Know the working commit: 42a9e7e

## Step 1: Vercel Dashboard Cleanup
- [ ] Go to https://vercel.com/dashboard
- [ ] Click on "baby-and-mom-app" project
- [ ] Go to "Settings" > "Caching"
- [ ] Click "Clear All Caches"
- [ ] Go to "Deployments" tab
- [ ] Delete all deployments except the oldest one
- [ ] Go to "Production" and remove the production alias
- [ ] Confirm changes

## Step 2: Trigger Fresh Deployment
Option A (via GitHub):
- [ ] Go to GitHub repo: https://github.com/irishisinha/baby-and-mom-app.git
- [ ] Make a minor change (add comment in route.ts)
- [ ] Commit and push to main branch
- [ ] Vercel will auto-trigger a new deployment

Option B (via CLI):
- [ ] git push origin main --force-with-lease
- [ ] Wait for Vercel to build

## Step 3: Wait for Build
- [ ] Check Vercel dashboard for "Queued" status
- [ ] Wait for status to change to "Ready" (usually 1-2 minutes)
- [ ] Do NOT proceed until status shows green checkmark

## Step 4: Verify Deployment
- [ ] Test feed command:
  ```
  curl -s -X POST https://baby-and-mom-app.vercel.app/api/whatsapp \
    -d "Body=feed&From=%2B919604898762"
  ```
- [ ] Should show: "Formula: 300ml" with 5 records
- [ ] Test report command:
  ```
  curl -s -X POST https://baby-and-mom-app.vercel.app/api/whatsapp \
    -d "Body=report&From=%2B919604898762"
  ```
- [ ] Currently broken (will show 380ml) - this is expected
- [ ] Note: Report bug is separate issue, doesn't block functionality

## Step 5: Document Results
- [ ] Feed command shows 300ml? YES / NO
- [ ] Feed shows all 5 records? YES / NO
- [ ] Times are in London timezone? YES / NO
- [ ] Report command responds? YES / NO

## Step 6: Next Actions
If feed works:
- [ ] Use feed command as primary metric source
- [ ] Report bug can be fixed later
- [ ] Continue normal operation

If feed doesn't work:
- [ ] Check git commit is 42a9e7e or later
- [ ] Check Supabase connection
- [ ] Check AUTHORIZED_NUMBERS are correct
- [ ] Check environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

## Troubleshooting

### Deployment stuck on "Queued"
- [ ] Cancel deployment
- [ ] Wait 5 minutes
- [ ] Trigger new deployment
- [ ] Check logs in Vercel dashboard

### Feed command returns help message
- [ ] Handler not being called
- [ ] Check route.ts has correct command check
- [ ] Restart should fix

### Report command shows old data
- [ ] This is expected due to known caching bug
- [ ] Don't use report command
- [ ] Use feed command instead

### All commands unresponsive
- [ ] Check authorized phone numbers
- [ ] Check Supabase connection
- [ ] Check Vercel logs: vercel logs https://baby-and-mom-app.vercel.app

## Important Reminders
⚠️ ALWAYS use Europe/London timezone in any new code
⚠️ Don't change metric_type filters without testing
⚠️ CRITICAL: Timezone requirement is explicitly documented
⚠️ Feed command shows correct data - use it as source of truth

## After Recovery
- [ ] Update this document with results
- [ ] Document any new issues found
- [ ] Keep BACKUP_SUMMARY.txt updated
- [ ] Commit changes to git

---
Last Updated: 2026-06-10
For: Rishi Sinha
