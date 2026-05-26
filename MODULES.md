# Module Breakdown

## Module 1: Project Init + Auth ✅
**Files**:
- `package.json` - dependencies
- `tsconfig.json` - TypeScript config
- `tailwind.config.ts` - styling
- `postcss.config.js` - CSS processing
- `next.config.js` - Next.js config with PWA
- `app/layout.tsx` - root layout
- `app/globals.css` - global styles
- `app/page.tsx` - landing page
- `app/login/page.tsx` - magic link login
- `public/manifest.json` - PWA manifest
- `.env.example` - environment template

**Flow**: User lands on `/` → clicks "Get Started" → magic link login → `/dashboard`

---

## Module 2: Database Schema ✅
**File**: `schema.sql`

**Tables**:
- `families` - root entity
- `users` - auth.users mirror
- `family_members` - join + roles
- `babies` - baby metadata
- `mothers` - mother metadata
- `baby_events` - feed, sleep, diapers, etc.
- `mother_events` - mood, water, sleep, meds, etc. (RLS-restricted)
- `vaccines` - immunization schedule
- `medications` - active meds
- `reminders` - tasks to send
- `audit_logs` - all mutations
- `whatsapp_messages` - message cache
- `invite_links` - onboarding links

**Security**: RLS on all; mother_events most restricted

---

## Module 3: Frontend Structure ✅
**Layout**: `app/dashboard/layout.tsx`
- Sidebar navigation
- Auth check
- Realtime subscription helpers

**Pages**:
- `app/dashboard/page.tsx` - Home (timeline)
- `app/dashboard/baby/page.tsx` - Baby stats & events
- `app/dashboard/mom/page.tsx` - Wellness (privacy note)
- `app/dashboard/reminders/page.tsx` - Upcoming tasks
- `app/dashboard/reports/page.tsx` - PDF/summary export
- `app/dashboard/family/page.tsx` - Members + invite

**Features**:
- Realtime updates via Supabase subscriptions
- One-handed UI (large buttons, mobile-first)
- Supportive tone, no medical advice

---

## Module 4: WhatsApp Webhook ✅
**File**: `app/api/whatsapp/webhook.ts`

**Endpoints**:
- `GET /api/whatsapp/webhook` - Meta verification
- `POST /api/whatsapp/webhook` - Inbound messages

**Flow**:
1. Meta sends message + signature
2. Verify HMAC-SHA256 signature
3. Extract phone, message_id, content
4. Store in `whatsapp_messages` table
5. Find family by phone → family_id
6. Call parser
7. Auto-log if confidence > 0.8
8. Send confirmation/clarification

**Helper**: `sendWhatsAppMessage(phone, text)`

---

## Module 5: AI Parser ✅
**File**: `app/api/parser/parse.ts`

**Function**: `parseMessage(text, phone, familyId)`

**Input**:
- User message (text)
- Sender phone
- Family ID (for context)

**Output** (`ParsedMessage`):
```typescript
{
  subject: "baby" | "mother"
  baby_id?: UUID
  mother_id?: UUID
  type: BabyEventType | MotherEventType
  value?: number
  unit?: string
  occurred_at: ISO string
  notes?: string
  confidence: 0.0-1.0
  clarification?: string  // if confidence < 0.8
  raw_input: string
}
```

**Logic**:
- Fetches babies/mothers in family
- Prompts GPT-4o-mini with context
- Parses JSON response
- Maps names to IDs
- Infers time (HH:MM) or uses now
- Handles errors gracefully

**Confidence Thresholds**:
- >0.95: silent auto-log
- 0.80-0.95: log + confirm
- 0.50-0.80: ask clarification
- <0.50: guide user

---

## Module 6: WhatsApp Commands [TODO]
**File**: `app/api/whatsapp/commands.ts`

**Commands** (case-insensitive):
- `today` → daily summary
- `week` → weekly stats
- `vaccines` → baby vaccine schedule
- `meds` → current medications
- `mom` → mother's summary
- `report` → PDF 7-day report (attach)

**Flow**:
1. Check if message is command
2. Query appropriate tables
3. Format response
4. Send via WhatsApp

---

## Module 7: Reminder Engine [TODO]
**File**: `app/api/cron/send-reminders.ts`

**Trigger**: Vercel Cron (every 15 min)

**Flow**:
1. Query reminders where `scheduled_at <= NOW` & `sent = false`
2. For each reminder:
   - Get `send_to_whatsapp_numbers`
   - Send message
   - Mark as sent
   - Update `sent_at`
3. Handle recurrence (daily → reschedule to +24h, etc.)

**Reminder Types**:
- Feed (baby)
- Diaper (baby)
- Water (mother)
- Medication (both)
- Mood check-in (mother, optional)
- Custom

---

## Module 8: PDF Reports [TODO]
**File**: `app/api/reports/pdf.ts`

**Endpoint**: `GET /api/reports/pdf?period=7&subject=baby`

**Content** (7-day):
- Summary stats (feeds, sleep, weight, etc.)
- Timeline of events
- Vaccine status (baby)
- Current medications
- Notes for doctor

**Content** (30-day):
- Charts (Recharts) embedded
- Weekly trends
- Mood sentiment (mother)
- Recovery progress
- Recommendations

**Output**: PDF file (React-PDF)

---

## Module 9: Charts & Dashboards [TODO]
**File**: `app/components/Chart*.tsx`

**Charts** (Recharts):
- `FeedChart` - feed frequency by time
- `SleepChart` - sleep hours per day
- `WeightChart` - baby growth
- `MoodChart` - mother sentiment over time
- `WaterChart` - hydration trend

**Dashboard Additions**:
- Date range selector (7d, 30d, custom)
- Export as PNG
- Compare to previous period

---

## Module 10: Family Invite & Admin [TODO]
**Files**:
- `app/api/family/invite.ts` - generate link
- `app/dashboard/family/page.tsx` - UI

**Flow**:
1. Admin clicks "Invite"
2. Generate unique token + QR code
3. Share link: `yourapp.com/join?token=xxx`
4. New member clicks → redirected to login
5. After auth, auto-added to family
6. Role set by invite (parent, nanny, etc.)

**Admin Features**:
- Member list with roles
- Change role
- Remove member
- View audit logs

---

## Module 11: E2E Testing & Deploy [TODO]
**Checklist**:
- [ ] RLS policies manual test
- [ ] Parser edge cases (typos, Hinglish, etc.)
- [ ] Webhook signature verification
- [ ] Cron trigger (manual call to /api/cron/...)
- [ ] PWA offline mode
- [ ] Security audit (no PII leaks)
- [ ] Load testing (100+ messages/day)
- [ ] Vercel deployment
- [ ] Production env vars
- [ ] WhatsApp webhook prod URL

**Deploy**:
```bash
npm run build
vercel --prod
```

---

## Type Definitions ✅
**File**: `lib/types/index.ts`

Exports:
- `User`, `Family`, `FamilyMember`
- `Baby`, `Mother`
- `BabyEvent`, `MotherEvent`
- `ParsedMessage`
- All enums (UserRole, DeliveryType, EventTypes, etc.)

---

## Supabase Client ✅
**File**: `lib/supabase.ts`

Exports:
- `supabase` - authenticated client (for SSR)
- `supabaseAdmin` - service role (for webhooks)

---

## Project Files Summary
```
app/
├── (landing) → page.tsx, login/
├── api/ → whatsapp/webhook.ts, parser/parse.ts, [cron, reports, family]
├── dashboard/ → layout.tsx, page.tsx, baby/, mom/, reminders/, reports/, family/

lib/
├── supabase.ts
├── types/index.ts

public/
├── manifest.json

config/
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── package.json

docs/
├── README.md
├── SETUP.md (this file)
├── MODULES.md (this file)
├── schema.sql
├── .env.example
```

---

## Next Immediate Steps

1. **Create Supabase project** (5 min)
   - supabase.com → create project
   - Copy URL & anon key

2. **Set env vars** (2 min)
   - Copy .env.example → .env.local
   - Add Supabase credentials
   - Add OpenAI API key
   - Add WhatsApp credentials (empty for now)

3. **Run Supabase SQL** (5 min)
   - Supabase dashboard → SQL Editor
   - Paste schema.sql → Execute
   - Verify tables created

4. **Test locally** (5 min)
   ```bash
   npm run dev
   # Open http://localhost:3000
   # Click "Get Started"
   # Check console for any errors
   ```

5. **Build Module 6** (WhatsApp commands)
   - Parse incoming text for keywords
   - Route to appropriate handler
   - Query + format response
   - Send back via WhatsApp

---

**Total build time estimate**: 22 hours for full MVP (6-8 hours per person, 2-3 people recommended).

Ready to ship a working MVP in ~1-2 weeks with focused development.
