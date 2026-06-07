# Database Base Schema - Supabase Reference

**Timezone:** Europe/London (GMT+1) - Used in ALL date operations
**Last Updated:** Latest deployment
**Status:** Production schema - Reference version

---

## TABLE: baby_metrics

**Purpose:** Central store for all baby and family member metrics

### Columns
id (UUID PRIMARY KEY)
family_id (UUID NOT NULL, FK to families.id)
baby_id (UUID NULLABLE, FK to babies.id - NULL for family wellness)
metric_type (VARCHAR - See metric types list below)
value (VARCHAR - Numeric or text based on metric type)
unit (VARCHAR - ml, kg, count, hours, steps, /10, text, minutes)
person_type (VARCHAR - baby, mom, dad, grandmom)
sent_from_phone (VARCHAR - Phone number that submitted metric)
created_at (TIMESTAMP DEFAULT now())
updated_at (TIMESTAMP DEFAULT now())

### Indexes
CREATE INDEX idx_baby_metrics_family_person_metric 
  ON baby_metrics(family_id, person_type, metric_type);
CREATE INDEX idx_baby_metrics_created_at 
  ON baby_metrics(created_at DESC);

### Metric Types (metric_type column)

BABY METRICS (person_type = 'baby'):
- formula (ml)
- breastmilk (ml)
- weight (kg) [Non-additive, last reading only]
- vaccine, diaper, bath, potty, oil (count)
- sleep (hours)

FAMILY WELLNESS (person_type = 'mom'|'dad'|'grandmom'):
- wellness_mood (text)
- wellness_steps (steps)
- wellness_energy (/10)
- wellness_pain (/10)
- wellness_sleep (hours)
- wellness_exercise (mins)
- wellness_medication (count)

---

## TABLE: appointments

**Purpose:** Store appointment records

### Columns
id (UUID PRIMARY KEY)
user_id (UUID NOT NULL, FK to auth.users.id)
doctor (VARCHAR - Appointment title/doctor name)
reason (VARCHAR - Appointment description)
appointment_date (DATE - YYYY-MM-DD)
appointment_time (VARCHAR - HH:MM format)
appointee_for (VARCHAR - baby, mom, dad, grandmom)
notes (TEXT)
created_at (TIMESTAMP DEFAULT now())
updated_at (TIMESTAMP DEFAULT now())

### Indexes
CREATE INDEX idx_appointments_user_date 
  ON appointments(user_id, appointment_date DESC);

---

## HARDCODED IDs (BE CAREFUL!)

FAMILY_ID: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6'
BABY_ID: 'e8a7c56c-62c6-442c-94ac-518928c8c07b'

Used in: lib/pilot-user.ts (source of truth), all API routes, dashboard queries
Changing these BREAKS the entire application!

---

## WEIGHT METRIC (Non-additive)

Weight is NOT aggregated like other metrics:
- NOT included in Today vs Yesterday totals
- Shown only as "Last Weight Reading"
- Most recent weight value displayed
- Never summed with other weight values

---

## KEY QUERIES

Fetch today's metrics (London timezone):
SELECT * FROM baby_metrics
WHERE family_id = $family_id
  AND person_type = 'baby'
  AND DATE(created_at AT TIME ZONE 'Europe/London') = CURRENT_DATE
ORDER BY created_at DESC;

Last 7 days (aggregated, excluding weight):
SELECT metric_type, COUNT(*) as count, SUM(CAST(value AS FLOAT)) as total
FROM baby_metrics
WHERE family_id = $family_id
  AND person_type = 'baby'
  AND metric_type != 'weight'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY metric_type;

Last weight reading:
SELECT value, unit, created_at FROM baby_metrics
WHERE family_id = $family_id
  AND metric_type = 'weight'
ORDER BY created_at DESC
LIMIT 1;

---

