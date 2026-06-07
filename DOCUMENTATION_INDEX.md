# Documentation Index - Complete Reference Library

This is the master index for all Shiva & Jaian Care project documentation.

---

## QUICK START FOR DEVELOPERS

New to the project? Start here:
1. Read PROJECT_BASE_ARCHITECTURE.md for overall project structure
2. Check DATABASE_BASE_SCHEMA.md if working with data
3. Review PAGES_REFERENCE.md if modifying screens/pages
4. Check API_ROUTES_CONFIG_REFERENCE.md if modifying API routes

Making changes?
1. ALWAYS reference the relevant document BEFORE editing code
2. Check critical constraints at the end of each document
3. Run the testing checklist in PROJECT_BASE_ARCHITECTURE.md before deploying
4. UPDATE documentation AFTER making major changes

---

## DOCUMENTATION FILES

### 1. PROJECT_BASE_ARCHITECTURE.md
Complete project overview and architecture reference

Contains:
  - Project structure
  - Core pages and features
  - Database schema overview
  - API routes overview
  - Mobile UI critical rules
  - Timezone handling (CRITICAL - Europe/London everywhere)
  - Authentication flow
  - Hardcoded constants (FAMILY_ID, BABY_ID)
  - Real-time updates
  - PWA and deployment configuration
  - Critical constraints and rules
  - Metric logging formats (WhatsApp)
  - Complete testing checklist

Use when:
  - Getting oriented with the project
  - Making changes affecting multiple areas
  - Before deploying to production
  - Understanding overall architecture

---

### 2. DATABASE_BASE_SCHEMA.md
Complete database schema reference

Contains:
  - baby_metrics table schema
  - appointments table schema
  - All metric types (baby and family wellness)
  - Hardcoded IDs and implications
  - Weight metric handling (non-additive)
  - Key database queries
  - RLS policies overview
  - Migration strategy for schema changes

Use when:
  - Adding new metric types
  - Querying the database
  - Understanding data relationships
  - Modifying database schema

---

### 3. PAGES_REFERENCE.md
Reference for all pages and screens

Contains:
  - /app/dashboard/layout.tsx documentation
  - /app/dashboard/page.tsx documentation
  - /app/dashboard/appointments/page.tsx documentation
  - /app/dashboard/mother/page.tsx documentation
  - /app/login and /app/auth/callback documentation
  - Key considerations for all pages
  - Modifications checklist

Use when:
  - Modifying any page or screen
  - Adding new features to existing pages
  - Troubleshooting UI/UX issues

---

### 4. API_ROUTES_CONFIG_REFERENCE.md
Complete API routes and configuration reference

Contains:
  - /api/whatsapp route documentation
  - /api/appointments route documentation
  - Configuration files documentation
  - Environment variables
  - Database access patterns
  - PWA configuration
  - Deployment checklist

Use when:
  - Modifying API routes
  - Changing configuration
  - Deploying to production
  - Understanding environment variables

---

### 5. WEBHOOK_BASE_REFERENCE.md
WhatsApp webhook integration reference

Contains:
  - Complete WhatsApp webhook documentation
  - All supported metric formats with examples
  - Metric parsing logic
  - Appointment parsing logic
  - Report generation
  - Error handling
  - Phone authorization

Use when:
  - Modifying WhatsApp integration
  - Troubleshooting WhatsApp messages
  - Understanding metric parsing

---

### 6. WEBHOOK_BASE_CODE.ts
Complete WhatsApp webhook code backup

Full working webhook implementation for reference.

---

## CRITICAL CONSTRAINTS SUMMARY

Timezone (CRITICAL):
  - ALWAYS use Europe/London (GMT+1)
  - Every date operation uses: timeZone: 'Europe/London'
  - Used in: Dashboard, WhatsApp, appointments, filters

WhatsApp Integration:
  - Responses MUST be TwiML/XML (never JSON)
  - Content-Type MUST be: application/xml

Mobile Navigation:
  - Bottom navigation persists on mobile (md:hidden)
  - Content padding: pb-24 md:pb-0

Session & Authentication:
  - Persists via localStorage['app-session']
  - PKCE OAuth flow
  - NO re-authentication needed after app save

Weight Metrics:
  - NON-ADDITIVE (not aggregated like others)
  - Shown as "Last Reading" separate card
  - Excluded from comparisons and averages

Hardcoded IDs (DO NOT CHANGE):
  - FAMILY_ID: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6'
  - BABY_ID: 'e8a7c56c-62c6-442c-94ac-518928c8c07b'
  - Changing these BREAKS the entire application

---

## WORKFLOW FOR MODIFICATIONS

Before Making Changes:
1. Identify which document is relevant
2. Read the relevant section
3. Check critical constraints
4. Review examples and patterns

While Making Changes:
1. Verify timezone handling if dealing with dates
2. Check if change affects hardcoded IDs
3. Ensure bottom nav stays visible on mobile
4. Test weight metric handling

After Making Changes:
1. Update the relevant documentation
2. Run the testing checklist
3. Test on mobile and desktop
4. Verify timezone (dates match London calendar)
5. Commit and deploy

---

## GOLDEN RULE

ALWAYS reference documentation BEFORE editing code!

This prevents:
  - Timezone inconsistencies
  - Mobile UI breakage
  - Database schema confusion
  - API incompatibilities
  - Session/auth issues
  - WhatsApp integration failures

When in doubt, reference the documents first!

---

