# Baby and Mom App - System Documentation

**Last Updated:** 2026-06-10  
**Status:** Feed working, Report broken

## Overview
WhatsApp-based baby metrics tracking. Next.js 14 + Supabase + Vercel.

## Database
- Family ID: df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6
- Baby ID: e8a7c56c-62c6-442c-94ac-518928c8c07b
- Authorized: +919604898762, +919871319008, +919914789171

## Current Data (2026-06-10)
Formula: 5 records = 300ml total
- 90ml at 02:47 London
- 90ml at 07:52 London
- 30ml at 08:18 London
- 30ml at 08:55 London
- 60ml at 10:51 London

Breastmilk: 0ml

## Commands
1. FEED - WORKING: Shows 300ml correctly
2. REPORT - BROKEN: Shows 380ml (BUG - Vercel caching)
3. APPT - WORKING: Appointment logging

## Critical Issue
Report command shows 380ml formula + 20ml breastmilk when database has 300ml + 0ml.
Root cause: Vercel deployment caching - code changes won't deploy.

Solution: Manual Vercel dashboard intervention needed
- Clear cache in Settings > Caching
- Delete production alias
- Redeploy

## Important: Timezone
ALWAYS use Europe/London timezone in all functions.
This is CRITICAL and explicitly documented in user feedback.

const formatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/London'
});

## Git Repo
https://github.com/irishisinha/baby-and-mom-app.git
Commit 42a9e7e: Last working version with working feed command

## Testing
Feed: curl -s -X POST https://baby-and-mom-app.vercel.app/api/whatsapp -d "Body=feed&From=%2B919604898762"
Report: curl -s -X POST https://baby-and-mom-app.vercel.app/api/whatsapp -d "Body=report&From=%2B919604898762"

## Files
app/api/whatsapp/route.ts - Main POST handler
app/api/whatsapp/commands.ts - Feed/Appt handlers
lib/supabase.ts - Supabase client
