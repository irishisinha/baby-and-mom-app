# Project Base Architecture Reference

Shiva & Jaian Care - Baby & Mom Tracking PWA
Framework: Next.js 14 (App Router)
Database: Supabase (PostgreSQL)
Hosting: Vercel
URL: https://baby-and-mom-app.vercel.app
Timezone: Europe/London (GMT+1) - CRITICAL

## PROJECT STRUCTURE

app/
  layout.tsx - Root layout, SessionProvider
  dashboard/
    layout.tsx - TopNavigation, BottomNavigation
    page.tsx - Main dashboard
    appointments/page.tsx - Appointment management
    mother/page.tsx - Family wellness tracking
  auth/callback/page.tsx - OAuth callback
  api/
    whatsapp/route.ts - WhatsApp integration
    appointments/route.ts - Appointment API

lib/
  supabase.ts - Supabase client
  pilot-user.ts - FAMILY_ID and BABY_ID

## CRITICAL HARDCODED IDs

FAMILY_ID: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6'
BABY_ID: 'e8a7c56c-62c6-442c-94ac-518928c8c07b'

Source: lib/pilot-user.ts
Used in: All API routes, dashboard, WhatsApp webhook
WARNING: Changing these BREAKS the entire application!

## DATABASE

baby_metrics Table:
  id, family_id, baby_id, metric_type, value, unit
  person_type: baby, mom, dad, grandmom
  Metric types: formula, breastmilk, weight, vaccine, diaper, bath, potty, oil, sleep
  Wellness types: wellness_mood, wellness_steps, wellness_energy, wellness_pain, wellness_sleep, wellness_exercise, wellness_medication

appointments Table:
  id, user_id, doctor, reason, appointment_date, appointment_time
  appointee_for: baby, mom, dad, grandmom

WEIGHT METRIC: Non-additive (last reading only, excluded from totals)

## API ROUTES

/api/whatsapp - WhatsApp metric logging
  POST handler receives Body and From fields
  parseMetric() extracts: metric_type, value, unit, personType
  getTodayVsYesterdayReport() - Baby metrics only, London timezone, excludes weight
  parseAppointmentMessage() - Parses appointment format
  Returns: TwiML/XML with Content-Type: application/xml
  AUTHORIZED_NUMBERS: ['+919604898762', '+919871319008', '+919914789171']

## MOBILE UI RULES

Bottom Navigation:
  Visibility: md:hidden (mobile only)
  Items: Home, Appointments, Metrics, Family, Mother
  Fixed at bottom-0, h-20
  MUST persist across ALL routes

Top Navigation:
  Headline: Shiva & Jaian Care
  Visible on mobile and desktop

Content Padding:
  pb-24 md:pb-0 on all dashboard pages
  Prevents content from hiding behind bottom nav

## TIMEZONE - CRITICAL EVERYWHERE

Use Europe/London (GMT+1) for ALL date operations

Pattern:
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const dateStr = londonTime.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

Used in:
  Dashboard: calculateDayComparison, calculateSummaryStats, fetchAppointments
  WhatsApp: getTodayVsYesterdayReport, appointment parsing
  All date comparisons and filters

## AUTHENTICATION

1. User visits /login
2. Enters email, receives magic link
3. Clicks link to /auth/callback
4. PKCE OAuth exchange
5. localStorage['app-session'] stores session
6. SessionProvider wraps app
7. Subsequent visits: Auto-login via localStorage
8. NO re-authentication needed

Config (lib/supabase.ts):
  persistSession: true
  flowType: 'pkce'
  storage: window.localStorage

## REAL-TIME UPDATES

Dashboard Supabase Subscriptions:
  channel('db-changes').on('postgres_changes')
  Listens to baby_metrics table changes
  Immediate refresh when WhatsApp logs metrics

## PWA DEPLOYMENT

Vercel:
  URL: https://baby-and-mom-app.vercel.app
  Framework: Next.js

next.config.js:
  skipWaiting: true
  clientsClaim: true
  Runtime caching: Google Fonts (1 year), stylesheets (1 week)

## CRITICAL CONSTRAINTS

1. Timezone: ALWAYS Europe/London (GMT+1)
2. WhatsApp: Responses MUST be TwiML/XML, Content-Type: application/xml
3. Session: localStorage 'app-session' persistent
4. Mobile Nav: MUST persist on ALL routes
5. Weight: Non-additive, shown as last reading, excluded from totals
6. Phone Auth: Flexible matching against AUTHORIZED_NUMBERS
7. IDs: FAMILY_ID and BABY_ID hardcoded everywhere

## METRIC LOGGING (WHATSAPP)

Baby:
  "30 ml formula" - formula metric
  "pumped 20 ml" - breastmilk metric
  "5.5 kg weight" - weight metric
  "vaccine", "diaper", "bath", "potty", "oil" - count metrics
  "sleep 2 hours" - sleep metric

Family Wellness:
  "shiva mood happy" - mom wellness mood
  "rishi steps 5000" - dad wellness steps
  "shiva energy 7" - mom wellness energy (1-10)
  "shiva pain 3" - mom wellness pain (1-10)
  "shiva medication 2" - mom wellness medication count
  "shiva sleep 8" - mom wellness sleep hours
  "shiva exercise 30" - mom wellness exercise minutes

Appointments:
  "Appointment- baby checkup 15 June 2:30 pm Dr. Smith"
  Format: "Appointment- [description] [day] [month] [HH:MM am/pm] [title]"

Report:
  Any message with "report"
  Returns: Today vs Yesterday (baby metrics only, no weight, London timezone)

## TESTING BEFORE DEPLOYMENT

[ ] Baby metrics log via WhatsApp
[ ] Family wellness logs with correct person_type
[ ] Appointments create/edit/delete work
[ ] Report command returns correct date range
[ ] Session persists across page closes
[ ] Mobile: Bottom nav persists, headline visible
[ ] Desktop: Top nav shows, bottom nav hidden
[ ] Timezone locked to London
[ ] Push notifications work
[ ] Vercel build completes successfully

## REFERENCE BEFORE ANY CODE EDITS

UPDATE THIS DOCUMENT AFTER EVERY MAJOR CHANGE.

For database details: see DATABASE_BASE_SCHEMA.md
For WhatsApp webhook: see WEBHOOK_BASE_REFERENCE.md
