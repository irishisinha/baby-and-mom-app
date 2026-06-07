# WhatsApp Webhook - BASE VERSION REFERENCE

**Last Updated:** Latest commit
**Status:** Reference/Template Version - Use this for all future changes
**Timezone:** Europe/London (GMT+1)
**Database:** Supabase baby_metrics table

## Complete Feature Set

### ✅ Baby Metrics (person_type: 'baby')
```
- Formula: "30 ml formula" or "formula 30ml"
- Breastmilk: "pumped 20ml", "20ml pumped", "breast milk 20", "20ml breast milk"
- Weight: "5.5 kg weight" or "weight 5.5kg" [Non-additive - shown as last reading]
- Vaccine: "vaccine"
- Diaper: "diaper"
- Bath: "bath"
- Potty: "potty"
- Oil: "oil"
- Sleep: "sleep 2 hours" or "2 hours sleep"
```

### ✅ Family Wellness Metrics
**MOM (Shiva):** `shiva [metric]` or `mom [metric]` or `mother [metric]`
**DAD (Rishi):** `rishi [metric]` or `dad [metric]` or `father [metric]`
**GRANDMOM (Ichi):** `ichi [metric]` or `grandmom [metric]` or `grandma [metric]`

**Available Wellness Metrics:**
```
- mood: "shiva mood happy" → wellness_mood
- steps: "shiva steps 5000" → wellness_steps
- energy: "shiva energy 7" → wellness_energy (1-10 scale)
- pain: "shiva pain 3" → wellness_pain (1-10 scale)
- sleep: "shiva sleep 8" → wellness_sleep (hours)
- exercise: "shiva exercise 30" → wellness_exercise (mins)
- medication: "shiva medication 2" → wellness_medication (count)
```

### ✅ Appointments
**Format:** `Appointment- [description] [day] [month] [HH:MM am/pm] [title]`
**Example:** `Appointment- doctor visit 15 december 2:30 pm vaccination`
- Creates entry in appointments table
- Parses date/time to ISO format
- Stores both description and title

### ✅ Report Command
**Trigger:** Any message containing "report"
**Response:** Today vs Yesterday comparison for BABY metrics only
- Excludes family wellness metrics
- Uses London timezone (GMT+1)
- Shows aggregated totals
- Excludes weight (shown as last reading only)

## Database Schema

### baby_metrics table
```sql
{
  id: uuid,
  family_id: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6',
  baby_id: 'e8a7c56c-62c6-442c-94ac-518928c8c07b' [NULL for family wellness],
  metric_type: string,
  value: string,
  unit: string,
  person_type: 'baby' | 'mom' | 'dad' | 'grandmom',
  sent_from_phone: string,
  created_at: timestamp
}
```

### appointments table
```sql
{
  id: uuid,
  user_id: string,
  doctor: string,
  reason: string,
  appointment_date: date,
  appointment_time: string,
  notes: string,
  created_at: timestamp
}
```

## Phone Authorization

**Authorized Numbers:** (in AUTHORIZED_NUMBERS array)
- +919604898762
- +919871319008
- +919914789171

**Number Normalization:** Removes spaces and "whatsapp:" prefix
- Handles: "+919604898762", "+91 9604898762", "whatsapp:+919604898762"

## Response Format

**Success:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>✓ Logged: [value][unit] [metric_type]</Message></Response>
Content-Type: application/xml
```

**Error:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Error: [message]</Message></Response>
Content-Type: application/xml
```

## Key Implementation Notes

1. **TwiML/XML Format:** MUST return `Content-Type: application/xml`, NOT JSON
2. **London Timezone:** ALL date operations use `timeZone: 'Europe/London'`
3. **Person Type Filtering:** Report excludes family wellness, shows only baby metrics
4. **Weight Handling:** Non-additive metric (shows last reading, not summed)
5. **Flexible Parsing:** Supports multiple input formats for same metric
6. **Error Logging:** All errors logged to console with [ERROR-TYPE] prefix

## Testing Checklist

Before deploying any changes:
- [ ] Baby metrics log correctly (formula, breastmilk, weight, etc)
- [ ] Family metrics log with correct person_type
- [ ] Report command returns data for correct date range
- [ ] Appointment creation with various date formats
- [ ] Phone number matching with/without spaces
- [ ] XML response format correct (Content-Type: application/xml)
- [ ] Timezone locked to Europe/London
- [ ] Weight excluded from report aggregation
- [ ] Database person_type field populated correctly

## Future Modifications - CRITICAL

When modifying this webhook:
1. Keep this documentation updated
2. Always maintain TwiML/XML format
3. Always use Europe/London timezone
4. Always filter family metrics from report
5. Always normalize phone numbers the same way
6. Always store person_type in database
7. Always test before deploying

## File Location
`app/api/whatsapp/route.ts`

## Related Files
- Dashboard: `app/dashboard/page.tsx` (displays metrics)
- Mother Wellness: `app/dashboard/mother/page.tsx` (displays family wellness)
- Report API: Handled in same route (GET not used, POST only)

