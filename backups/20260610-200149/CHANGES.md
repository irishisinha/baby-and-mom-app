# Changes Made (2026-06-10)

## 1. Feed Timing - Time Extraction (✅ DONE)
- Added extractTimeFromMessage() function
- Extracts time patterns: 2:47pm, 14:47, 2.47, etc
- Falls back to current timestamp if no time found
- Updated metric logging to use extracted time

## 2. Reminders Feature (⏳ PENDING)
- API routes ready (GET, POST, PUT, DELETE)
- Dashboard page ready
- Needs Supabase table creation
- SQL provided for table creation

## Files Updated
- app/api/whatsapp/route.ts (added time extraction)

## Files Ready to Create
- app/api/reminders/route.ts
- app/dashboard/reminders/page.tsx

## Commits
- f3950fe: Time extraction feature
- 95d5998: Reminders documentation
