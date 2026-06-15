# 🔐 DEPLOYMENT LOCK

**Status**: LOCKED - Stable Working Version  
**Date**: 2026-06-15

## Current Stable Version
Commit: 48d1d55
Tag: stable-appointment-parsing-fixed
**What was fixed**: WhatsApp appointment parsing (both natural language formats now work)

## Before Making Any Changes
1. Test locally: npm run build
2. Deploy preview first: vercel deploy
3. Test preview thoroughly
4. Only then deploy prod: vercel deploy --prod

## Emergency Rollback
```bash
git reset --hard <good-commit-hash>
git push origin main --force
Wait for Vercel to redeploy
```

## What's Working
- Feed command ✅
- Report command ✅
- Metric logging ✅
- Timezone handling ✅
- **Appointment parsing (natural language)** ✅
- **Appointment parsing (strict format)** ✅

## What NOT to Change
- Timezone: Europe/London
- Database table: baby_metrics
- Report format: Today vs Yesterday
- Feed order: by created_at ascending
- Appointment regex: uses `/\b/.source` to work around SWC compiler bug (do NOT use `\\b` in template literals)
- Appointment inserts: require `user_id` field (use SYSTEM_USER_ID for WhatsApp webhooks)
