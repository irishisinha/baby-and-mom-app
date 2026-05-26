# Module-by-Module Build Plan

## ✅ COMPLETED (Module 1-5)

### Module 1: Project Init + Auth
- [x] Next.js 14 with App Router
- [x] TypeScript + Tailwind configured
- [x] Supabase client setup
- [x] Magic link login page
- [x] PWA manifest
- [x] Environment template

### Module 2: Database Schema
- [x] Supabase SQL schema (schema.sql)
- [x] RLS policies on all tables
- [x] Indexes for performance
- [x] Mother's data extra-restricted
- [x] Audit log structure
- [x] WhatsApp message cache table

### Module 3: Frontend Structure
- [x] Dashboard layout with nav
- [x] Home page (timeline view)
- [x] Baby tab (stub)
- [x] Mom tab (privacy note)
- [x] Reminders page (stub)
- [x] Reports page (stub)
- [x] Family page (stub)
- [x] Realtime subscription examples

### Module 4: WhatsApp Webhook
- [x] POST /api/whatsapp/webhook - Meta signature verification
- [x] Message extraction (text/voice)
- [x] Family lookup by phone
- [x] WhatsApp message storage
- [x] Message sending helper
- [x] Confidence-based auto/manual logging

### Module 5: AI Parser
- [x] GPT-4o-mini integration
- [x] Context-aware parsing (babies/mothers in family)
- [x] Type detection & confidence scoring
- [x] Clarification prompts (<0.8)
- [x] Time inference (HH:MM)
- [x] Baby/mother name resolution
- [x] Error fallback with helpful message

---

## 🔄 TODO (Module 6-11)

### Module 6: WhatsApp Commands [HIGH PRIORITY]
- [ ] Parse incoming text for commands: today, week, vaccines, meds, mom, report
- [ ] Query builder for each command
- [ ] Format responses as WhatsApp text
- [ ] Caching layer for quick responses
- **API**: POST /api/whatsapp/command

### Module 7: Reminders Engine [CRITICAL]
- [ ] Vercel Cron: every 15 minutes
- [ ] Query due reminders (scheduled_at <= now)
- [ ] Filter by recipient phones (send_to_whatsapp_numbers)
- [ ] Send via WhatsApp (batch friendly)
- [ ] Mark as sent + timestamp
- [ ] Recurrence logic (daily, weekly, once)
- **Cron**: /api/cron/send-reminders (POST from Vercel)

### Module 8: PDF Reports
- [ ] React-PDF integration
- [ ] 7-day summary template (feeds, sleep, diapers for baby; mood, water, meds for mom)
- [ ] 30-day summary with charts (Recharts)
- [ ] PDF generation & S3 upload
- [ ] Attach to WhatsApp message
- **API**: GET /api/reports/pdf?period=7|30&subject=baby|mother

### Module 9: Charts & Dashboards
- [ ] Recharts setup (LineChart, BarChart, PieChart)
- [ ] Baby: feed frequency, sleep hours, weight trend
- [ ] Mom: mood sentiment, sleep trend, water intake
- [ ] Date range selector (7d, 30d, custom)
- [ ] Export as image
- **Dashboards**: Baby & Mom tabs

### Module 10: Family Invite & Admin
- [ ] Generate time-limited invite links
- [ ] Link redemption flow
- [ ] Role-based access (parent, grandparent, nanny, admin)
- [ ] Member list with roles
- [ ] Delete/edit member
- [ ] Audit log view
- **API**: POST /api/family/invite, GET /api/family/members

### Module 11: E2E Testing & Deploy
- [ ] Verify RLS policies (manual queries)
- [ ] Test WhatsApp webhook signature
- [ ] Parser confidence edge cases
- [ ] Cron reminders (manual trigger)
- [ ] PWA offline mode
- [ ] Security audit
- [ ] Vercel deployment
- [ ] Production env vars

---

## 🏗️ Current Structure

```
baby-and-mom-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── login/page.tsx
│   ├── api/
│   │   ├── whatsapp/webhook.ts
│   │   └── parser/parse.ts
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── baby/page.tsx
│       ├── mom/page.tsx
│       ├── reminders/page.tsx
│       ├── reports/page.tsx
│       └── family/page.tsx
├── lib/
│   ├── supabase.ts
│   └── types/index.ts
├── public/
│   └── manifest.json
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── schema.sql
├── .env.example
└── README.md
```

---

## 🚀 Next Steps

1. **Create Supabase Project**
   - Go to supabase.com, create free project
   - Note URL & anon key

2. **Set Up WhatsApp Business**
   - Create Facebook Business account
   - Apply for WhatsApp Business API
   - Get phone number ID & access token

3. **Get OpenAI Key**
   - openai.com → create API key
   - Test with: `curl -X POST ... -d '{"model": "gpt-4o-mini", ...}'`

4. **Local Setup**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx
   OPENAI_API_KEY=sk-xxx
   WHATSAPP_BUSINESS_ACCOUNT_ID=xxx
   WHATSAPP_PHONE_NUMBER_ID=xxx
   WHATSAPP_ACCESS_TOKEN=xxx
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=random-string-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run Supabase SQL**
   - In Supabase dashboard: SQL Editor
   - Copy schema.sql & execute
   - Verify tables + RLS policies

6. **Test Locally**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Click "Get Started" → sign in with magic link
   ```

7. **Webhook Tunnel (for local testing)**
   ```bash
   npm install -g ngrok
   ngrok http 3000
   # Add https://xxx.ngrok.io/api/whatsapp/webhook to Meta Webhook config
   ```

8. **Test Parser**
   - Send WhatsApp message to your number
   - Check console logs for parse result
   - Verify message stored in `whatsapp_messages` table

9. **Deploy to Vercel**
   ```bash
   vercel
   # Set production env vars
   # Update Meta webhook URL to production
   # Enable Cron in vercel.json
   ```

---

## 💡 Key Design Decisions

### WhatsApp-First, Not App-First
- Sleep-deprived parents won't switch apps
- Text is fastest input method
- PWA for deep dives (charts, settings, reports)

### AI Confidence Tiers
- >0.95: silent auto-log
- 0.80-0.95: log + confirm message
- 0.50-0.80: ask for clarification
- <0.50: guide user with examples

### Privacy Tiers
- Baby events: visible to all family members
- Mother events: **only self + admin**
- Audit logs: **only admin**
- No PII in WhatsApp body (only phone)

### Cost Control
- GPT-4o-mini (cheap) instead of GPT-4
- Supabase free tier for small families
- Vercel free + optional Cron
- No storage (S3) — PDFs generated on demand
- **Target: <$20/mo for one family**

---

## 🔒 Security Checklist

- [ ] All RLS policies enabled
- [ ] Mother's data triple-checked
- [ ] Audit log captures all mutations
- [ ] OpenAI API key in env only
- [ ] WhatsApp token in env only
- [ ] No PII in logs or error messages
- [ ] Signature verification for webhook
- [ ] HTTPS enforced in production
- [ ] Rate limiting on API (plan: TODO)
- [ ] SQL injection prevention (Supabase handles)

---

## 📞 Support

Stuck? Check:
1. `.env.local` — all keys present?
2. Supabase RLS policies — can you SELECT from tables?
3. OpenAI API key — valid & has quota?
4. WhatsApp webhook — returning 200 to Meta?

---

**Status**: MVP framework complete. Ready for Module 6 (WhatsApp commands).
