# API Routes & Configuration Reference

---

## API ROUTE: /api/whatsapp

File: app/api/whatsapp/route.ts
See: WEBHOOK_BASE_REFERENCE.md and WEBHOOK_BASE_CODE.ts for complete details

Method: POST
Input: URL-encoded WhatsApp message (Body and From fields)
Output: TwiML/XML response with Content-Type: application/xml

Key Functions:
  - parseMetric(): Extracts metric from text message
  - getTodayVsYesterdayReport(): Generates daily comparison report
  - parseAppointmentMessage(): Parses appointment format

Authorization:
  - Phone numbers checked against AUTHORIZED_NUMBERS array
  - Flexible matching (handles spaces and prefixes)
  - Returns "Not authorized" error if not in list

Response Format:
  XML: <?xml version="1.0" encoding="UTF-8"?><Response><Message>[msg]</Message></Response>
  CRITICAL: Must be TwiML/XML, NOT JSON (JSON causes 502 errors)

---

## API ROUTE: /api/appointments

File: app/api/appointments/route.ts
Method: GET - Fetch appointments
Method: POST - Create appointment

GET /api/appointments
  Returns: Array of appointments (all for authenticated user)
  Query params: Optional filters for upcoming/previous

POST /api/appointments
  Body: { title, description, appointment_date, appointment_time }
  Returns: Created appointment with id

DELETE /api/appointments/[id]
  Deletes specific appointment
  Returns: Success message

---

## CONFIGURATION FILES

### lib/supabase.ts
Purpose: Supabase client initialization

Key Settings:
  persistSession: true (persist session in localStorage)
  flowType: 'pkce' (OAuth PKCE flow)
  storage: window.localStorage (use localStorage for session storage)

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY: Public anon key
  SUPABASE_SERVICE_ROLE_KEY: Service role key (for API routes)

---

### lib/pilot-user.ts
Purpose: Hardcoded IDs for pilot family

CRITICAL IDs:
  FAMILY_ID: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6'
  BABY_ID: 'e8a7c56c-62c6-442c-94ac-518928c8c07b'

WARNING: These are hardcoded everywhere and used in:
  - WhatsApp webhook (/api/whatsapp/route.ts)
  - Dashboard queries (app/dashboard/page.tsx)
  - All appointment and metric routes
  - All Supabase queries

Changing these BREAKS the entire application!

---

### next.config.js
Purpose: Next.js and PWA configuration

PWA Settings (next-pwa plugin):
  skipWaiting: true
    - Forces service worker to activate immediately
    - Prevents waiting for clients to reload
    - Ensures users get latest version faster

  clientsClaim: true
    - New service worker claims pages immediately
    - Prevents stale cache being served
    - Ensures freshest content

Runtime Caching:
  Google Fonts:
    strategy: 'cache-first'
    expiration: 1 year
    Fonts are relatively static, cache for long period

  Stylesheets:
    strategy: 'stale-while-revalidate'
    expiration: 1 week
    Serve stale version while fetching fresh copy

Build Configuration:
  Framework: next.js
  ReactStrictMode: true
  swcMinify: true

---

### next.pwa.js (PWA Configuration)
Purpose: Progressive Web App service worker settings

Key Settings:
  dest: 'public' (service worker destination)
  register: true (auto-register service worker)
  scope: '/' (scope for service worker)
  swSrc: 'public/sw.js' (custom service worker)

Caching Strategies:
  - Cache-first: Return from cache, fall back to network
  - Network-first: Try network first, fall back to cache
  - Stale-while-revalidate: Serve cache while updating

---

## ENVIRONMENT VARIABLES

Required in Vercel / .env.local:

NEXT_PUBLIC_SUPABASE_URL
  - Public Supabase project URL
  - Format: https://[project-id].supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Public anonymous key for client-side operations
  - Scope: Limited to what's defined in RLS policies

SUPABASE_SERVICE_ROLE_KEY
  - Service role key for server-side operations
  - KEEP SECRET - do not expose to frontend
  - Used in API routes (/api/whatsapp, /api/appointments)

NEXT_PUBLIC_FIREBASE_CONFIG
  - Firebase configuration for push notifications
  - Includes: apiKey, projectId, messagingSenderId, etc

---

## DATABASE ACCESS PATTERNS

All Supabase queries use Row Level Security (RLS)

Security Rules:
  - Users can only access metrics for their family_id
  - Service role key bypasses RLS (only in API routes)
  - Client queries enforce family_id in auth context

Query Examples:
  1. Fetch today's baby metrics (London timezone)
     SELECT * FROM baby_metrics
     WHERE family_id = $family_id
       AND person_type = 'baby'
       AND DATE(created_at AT TIME ZONE 'Europe/London') = CURRENT_DATE

  2. Fetch last 7 days aggregated (excluding weight)
     SELECT metric_type, SUM(CAST(value AS FLOAT)) as total
     FROM baby_metrics
     WHERE family_id = $family_id
       AND person_type = 'baby'
       AND metric_type != 'weight'
       AND created_at > NOW() - INTERVAL '7 days'
     GROUP BY metric_type

  3. Fetch last weight reading
     SELECT value, unit, created_at FROM baby_metrics
     WHERE family_id = $family_id AND metric_type = 'weight'
     ORDER BY created_at DESC LIMIT 1

---

## CRITICAL DEPLOYMENT CHECKLIST

Before deploying to production:

Environment Variables:
  [ ] NEXT_PUBLIC_SUPABASE_URL set in Vercel
  [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set in Vercel
  [ ] SUPABASE_SERVICE_ROLE_KEY set in Vercel
  [ ] NEXT_PUBLIC_FIREBASE_CONFIG set in Vercel

Build:
  [ ] npm run build completes without errors
  [ ] No TypeScript errors
  [ ] No console warnings in critical paths

Testing:
  [ ] WhatsApp integration returns XML (not JSON)
  [ ] Metrics created via WhatsApp show on dashboard
  [ ] Appointments create/edit/delete work
  [ ] Session persists across app close/reopen
  [ ] Mobile bottom nav persists on all screens
  [ ] Timezone locked to London on all dates

Vercel:
  [ ] Domain pointing correctly
  [ ] Build logs show successful deployment
  [ ] App accessible at https://baby-and-mom-app.vercel.app

---

## TIMEZONE REMINDER

EVERY date operation uses Europe/London (GMT+1)

Correct Pattern:
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const dateStr = londonTime.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

Wrong Patterns (NEVER USE):
  const dateStr = new Date().toLocaleDateString() // Uses local browser timezone
  const dateStr = new Date(Date.now()).toISOString() // Uses UTC

---

## QUICK REFERENCE

For database schema: see DATABASE_BASE_SCHEMA.md
For project architecture: see PROJECT_BASE_ARCHITECTURE.md
For pages/screens: see PAGES_REFERENCE.md
For WhatsApp webhook: see WEBHOOK_BASE_REFERENCE.md
