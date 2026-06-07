# Key Pages & Screens Reference Backup

This document provides an index of critical pages and their purposes.
For actual code, reference the source files directly.

---

## /app/dashboard/layout.tsx

Purpose: Main layout container for all dashboard routes
Contains: TopNavigation and BottomNavigation components
Key Components:
  - TopNavigation: Headline "Shiva & Jaian Care", desktop navigation links
  - BottomNavigation: Persistent mobile navigation (md:hidden), 5 icons
  - FirebaseNotifications, UpdateNotification integration
  - Session initialization checking localStorage 'app-session'

Critical Rules:
  - BottomNavigation MUST persist on ALL child routes
  - TopNavigation visible on both mobile and desktop
  - No sidebar on mobile (removed entirely)

---

## /app/dashboard/page.tsx

Purpose: Main dashboard showing metrics summary, appointments, activity
Features:
  - Real-time Supabase subscriptions for baby_metrics and appointments
  - calculateDayComparison(): Today vs Yesterday (excludes weight, London timezone)
  - calculateSummaryStats(): 7-day averages
  - calculateLastWeight(): Separate weight reading (non-additive)
  - fetchAppointments(): Upcoming appointments (earliest first)
  
Key Functions:
  - Uses Europe/London timezone for ALL date operations
  - Filters metrics by person_type='baby' (excludes family wellness)
  - Excludes weight from aggregations
  - Edit/delete buttons on metrics with inline editing via Supabase

Sections Displayed:
  - Today vs Yesterday: Pink/red card, metric comparisons
  - Last 7 Days: Green card, averaged metrics
  - Last Weight Reading: Separate card showing most recent weight
  - Upcoming Appointments: Earliest first, with edit/delete buttons
  - Recent Activity: List of recent metric logs with timestamps

Padding: pb-24 md:pb-0 (accommodates bottom nav on mobile)

---

## /app/dashboard/appointments/page.tsx

Purpose: Full appointment management (create, edit, delete)
Sections:
  - UPCOMING APPOINTMENTS: appointment_date >= today, sorted ascending
  - PREVIOUS APPOINTMENTS: appointment_date < today, sorted descending

Create Form:
  - Inputs: Title, Description, Date, Time
  - Validation: All fields required

Edit Form:
  - Shows "Editing: [title]" header with yellow background
  - Inline form with Save and Cancel buttons
  - Updates appointment in Supabase on Save

Delete:
  - Confirmation modal showing appointment title
  - Deleted via API DELETE request

Key Constraint:
  - Upcoming appointments sorted EARLIEST FIRST (ascending date order)
  - Previous appointments sorted LATEST FIRST (descending date order)

---

## /app/dashboard/mother/page.tsx

Purpose: Family wellness tracking for mom, dad, grandmom
Query: baby_metrics with person_type='mom' and metric_type LIKE 'wellness_%'

Supported Metrics:
  - wellness_mood: text (happy, good, etc)
  - wellness_steps: number
  - wellness_energy: 1-10 scale
  - wellness_pain: 1-10 scale
  - wellness_sleep: hours
  - wellness_exercise: minutes
  - wellness_medication: count

Features:
  - Quick log form with 7 metric type options
  - Summary statistics
  - Weekly averages
  - Recent wellness log display

---

## /app/login

Purpose: Authentication entry point
Flow:
  1. User enters email
  2. Magic link sent
  3. Redirect to /auth/callback
  4. PKCE OAuth exchange
  5. localStorage['app-session'] stored
  6. Redirect to /dashboard

---

## /app/auth/callback

Purpose: OAuth callback handler
Flow:
  1. Receives code from Supabase OAuth
  2. Exchanges code for session token (PKCE)
  3. Stores session in localStorage
  4. Redirects to dashboard

---

## KEY CONSIDERATIONS FOR ALL PAGES

Timezone: ALWAYS use Europe/London (GMT+1)
Example: new Date().toLocaleString('en-US', { timeZone: 'Europe/London' })

Session: Check localStorage['app-session'] for auth state
Sessions persist across page closes and app restarts

Mobile Nav: BottomNavigation persists on all routes
Desktop Nav: BottomNavigation hidden (md:hidden), TopNavigation visible

Padding: pb-24 md:pb-0 on all pages
Prevents content from being hidden behind bottom nav on mobile

Real-time Updates: Use Supabase subscriptions
channel('db-changes').on('postgres_changes')
Listen to baby_metrics table for immediate updates

---

## WHEN MODIFYING PAGES

Before Changes:
  1. Verify timezone usage (Europe/London)
  2. Check session handling (localStorage)
  3. Ensure bottom nav visibility on mobile
  4. Check if weight metric handling needed (non-additive)

After Changes:
  1. Test mobile view (bottom nav persists, content visible)
  2. Test desktop view (bottom nav hidden, content full width)
  3. Verify timezone (dates match London calendar)
  4. Test session persistence (close and reopen app)
  5. Verify real-time updates work

---

For complete architectural details: see PROJECT_BASE_ARCHITECTURE.md
For database schema: see DATABASE_BASE_SCHEMA.md
For WhatsApp webhook: see WEBHOOK_BASE_REFERENCE.md
