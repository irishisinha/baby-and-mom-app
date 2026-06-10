# 🔐 DEPLOYMENT LOCK

**Status**: LOCKED - Stable Working Version  
**Date**: 2026-06-10

## Current Stable Version
Commit: b5ca472
Tag: stable-20260610-143941

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

## What NOT to Change
- Timezone: Europe/London
- Database table: baby_metrics
- Report format: Today vs Yesterday
- Feed order: by created_at ascending
