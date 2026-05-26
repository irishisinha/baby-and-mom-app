# Baby & Mom Care Tracker

WhatsApp + PWA app for tracking baby and postpartum mother health in family homes. Reduces logging fatigue by letting caregivers send natural text/voice messages to WhatsApp instead of opening an app.

## Features

### WhatsApp Interface
- Send text or voice messages: "baby ate 120ml" or "mom slept 4 hours"
- AI parser (GPT-4o-mini) extracts structured data automatically
- Two-way commands: `today`, `week`, `vaccines`, `meds`, `report`
- Auto-summaries and optional mood check-ins for mother
- PDF reports as attachments

### PWA Dashboard
- Mobile-first, installable, offline-capable
- Combined timeline with quick-log buttons
- Baby tab: charts, vaccines, milestones
- Mom tab: mood, sleep, recovery (extra privacy)
- Reminders: upcoming for both
- Reports: 7/30-day summaries with PDF export
- Family: invite links, member management
- Settings & audit logs

### Privacy & Security
- RLS on all tables; strict access control
- Mother's mood/mental health most restricted (only self + admin)
- Encrypted at rest; audit logs all mutations
- No tracking, ads, or social features

## Architecture

```
WhatsApp → Webhook → Parser (GPT-4o-mini) → Supabase
                                               ↓
                                          Realtime ↔ PWA
                                            ↓
                                        Cron Reminders
```

## Setup

### 1. Prerequisites
- Node.js 18+
- Supabase project (free tier OK)
- OpenAI API key
- Meta WhatsApp Business API access

### 2. Clone & Install
```bash
cd baby-and-mom-app
npm install
```

### 3. Environment Variables
```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase
- `SUPABASE_SERVICE_ROLE_KEY` for server operations
- `OPENAI_API_KEY` from OpenAI
- `WHATSAPP_*` credentials from Meta Business

### 4. Database Schema
- Run `schema.sql` in Supabase SQL Editor
- All tables have RLS enabled automatically
- Indexes created for performance

### 5. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel
```bash
vercel
# Set environment variables in Vercel dashboard
```

## WhatsApp Setup

### 1. Meta Business Account
1. Create business account at business.facebook.com
2. Create WhatsApp Business app
3. Get phone number ID & access token

### 2. Webhook Configuration
- In Meta App Dashboard → Webhooks
- URL: `https://yourapp.com/api/whatsapp/webhook`
- Verify Token: `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Subscribe to `messages` events

### 3. First Login
- Members scan QR or click magic link
- Family admin invites others with link
- All sync via Supabase Realtime

## Usage Examples

### WhatsApp Logging
```
"baby ate 120ml formula at 2pm"
→ Parsed: feed, 120ml, time 14:00

"mom slept 3 hours"
→ Parsed: sleep, 3hrs

"aria has a rash on her face"
→ Confidence 0.6: "Is this for Aria (baby)? Logging as rash."

"feeling overwhelmed"
→ Parsed: mood, logged only for self/admin access
```

### Dashboard
- Home: combined timeline + quick-log buttons
- 👶 Baby: age, feeds/day, last event
- 👩 Mom: wellness stats, mood trend
- 🔔 Reminders: feed, medication, water, mood check-in
- 📊 Reports: summaries + PDFs for doctors
- 👨‍👩‍👧‍👦 Family: invite link, member roles

### Commands
Send via WhatsApp:
- `today` → Daily summary for baby & mom
- `week` → Weekly stats
- `vaccines` → Baby vaccine schedule
- `meds` → Current medications for both
- `mom` → Mother's wellness summary
- `report` → PDF 7-day report

## Cost Breakdown

| Service | Est. Monthly | Notes |
|---------|--------------|-------|
| Supabase | $5 | Free tier; upgrade if >10GB |
| OpenAI (GPT-4o-mini) | $8-10 | ~100 msgs/day @ $0.003/msg |
| Meta WhatsApp | $1-5 | $0.01/inbound, $0.04/outbound |
| Vercel | $0 | Free tier includes Cron |
| **Total** | **$14-20** | |

## Database Schema

### Core Tables
- `families` - family entity
- `users` - auth users
- `family_members` - roles & access
- `babies` - baby info
- `mothers` - mother info
- `baby_events` - feed, sleep, diapers, etc.
- `mother_events` - mood, sleep, meds, etc. (RLS-protected)
- `vaccines` - immunization schedule
- `medications` - active meds for both
- `reminders` - upcoming tasks
- `audit_logs` - all mutations
- `whatsapp_messages` - message history
- `invite_links` - onboarding links

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/whatsapp/webhook` | Meta webhook |
| POST | `/api/parser/parse` | GPT-4o-mini parser |
| POST | `/api/events` | Log event (PWA) |
| GET | `/api/timeline` | Fetch events |
| GET | `/api/reminders` | Upcoming reminders |
| POST | `/api/family/invite` | Generate invite link |
| GET | `/api/reports/[period]` | 7/30-day summary |

## Privacy Notes

1. **Mother's Mental Health**: Mood, anxiety, depression logs only visible to mother + family admin
2. **Audit Trail**: Every event logged with actor, timestamp, old/new values
3. **No Sync to Cloud**: PWA caches locally; all data in Supabase
4. **No Medical Advice**: Parser never diagnoses; always says "share with your doctor"
5. **RLS Enforced**: Even if token is leaked, user can only see their family's data

## Next Steps (Future)

- [ ] Charts (Recharts) for trends
- [ ] PDF reports (React-PDF)
- [ ] Voice logging via Whisper API
- [ ] SMS as fallback (Twilio)
- [ ] Offline-first sync
- [ ] Export to Apple Health / Google Fit
- [ ] Integration with EHR systems

## Support

For issues: https://github.com/your-repo/issues

For setup help, see Supabase & OpenAI docs.

---

Built with Next.js, Supabase, OpenAI, and ❤️ for families.
