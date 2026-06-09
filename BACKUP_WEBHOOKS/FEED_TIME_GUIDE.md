# Feed & Metric Time Tracking

## Overview

You can now optionally include the time when logging feeds and other metrics. If you don't specify a time, the system automatically uses the current time.

## How to Use

### Option 1: Include Time in Message (Recommended)

Specify the time directly in your message:

**Formula Examples:**
```
30 ml formula at 2:30 pm
30 ml formula 2:30 pm
formula 30 ml at 14:30
30ml formula 14:30
```

**Sleep Examples:**
```
sleep 2 hours at 10:15 pm
sleep 2h 10:15 pm
2 hours sleep 22:15
```

**Vaccine Examples:**
```
vaccine at 3:00 pm
vaccine 15:00
```

**Diaper Examples:**
```
diaper at 2:45 pm
diaper 14:45
```

### Option 2: Let System Use Current Time

Just send the message normally - the current time is automatically recorded:

```
30 ml formula              → saved with current time
sleep 2 hours              → saved with current time
vaccine                    → saved with current time
diaper                     → saved with current time
```

## Time Format Support

The system understands various time formats:

**12-Hour Format (with am/pm):**
- `at 2:30 pm`
- `2:30 pm`
- `at 10:15 am`
- `10:15am`

**24-Hour Format:**
- `at 14:30`
- `14:30`
- `at 22:15`
- `22:15`

## All Metrics That Support Time

✓ **Baby Metrics:**
- Formula (ml)
- Weight (kg)
- Breastmilk (ml)
- Sleep (hours)
- Vaccine
- Diaper
- Bath
- Potty
- Oil

✓ **Wellness Metrics:**
- Steps
- Mood
- Energy
- Pain
- Sleep
- Medication
- Exercise

## Examples

### Complete Examples

**Morning Feed:**
```
Send: 45 ml formula at 8:00 am
Response: ✓ 45ml formula
Saved: Time 08:00:00
```

**Daytime Feed:**
```
Send: 60 ml formula 2:30 pm
Response: ✓ 60ml formula
Saved: Time 14:30:00
```

**Evening Feed (24-hour format):**
```
Send: 50 ml formula 18:45
Response: ✓ 50ml formula
Saved: Time 18:45:00
```

**Sleep with time:**
```
Send: sleep 2 hours at 9:00 pm
Response: ✓ 2hours sleep
Saved: Time 21:00:00
```

**No time specified:**
```
Send: 30 ml formula
Response: ✓ 30ml formula
Saved: Time [current time, e.g., 14:32:15]
```

## Database

The metric is saved with:

```json
{
  "metric_type": "formula",
  "value": "30",
  "unit": "ml",
  "metric_time": "14:30:00",
  "created_at": "2026-06-09T14:30:00+01:00",
  "person_type": "baby"
}
```

**Fields:**
- `metric_time` - The time the feed/metric occurred (HH:MM:SS format)
- `created_at` - When the message was received
- Both times are in Europe/London timezone

## Use Cases

### Logging Past Feeds

If you didn't log a feed immediately, specify when it happened:

```
Send: 40 ml formula at 10:30 am
(Sent at 10:45 am but feeds at 10:30 am)
```

### Tracking Daily Feeding Schedule

```
Send: 30 ml formula at 8:00 am
Send: 40 ml formula at 12:00 pm
Send: 50 ml formula at 4:00 pm
Send: 60 ml formula at 8:00 pm
```

The dashboard can show when feeds occurred throughout the day.

### Night Feeds

```
Send: 30 ml formula at 2:30 am
Send: 30 ml formula at 5:00 am
```

## Tips

✓ **Be consistent** - Always include time or always let it auto-use current time

✓ **Use clear format** - "30 ml formula at 2:30 pm" is clearer than "formula 30 at 14:30"

✓ **PM times** - Remember to include "pm" for afternoon times, or use 24-hour format

✓ **Past feeds** - You can log feeds from earlier by specifying the time

✓ **Timezone** - All times are automatically converted to Europe/London timezone

## Troubleshooting

**Q: I specified a time but it wasn't saved**
A: Check the time format. Use patterns like "2:30 pm" or "14:30". If unclear, the system uses current time.

**Q: Why is the saved time different?**
A: Times are normalized to Europe/London timezone. If you're in a different timezone, times are converted.

**Q: Can I update the time later?**
A: Currently, times are set when logged. For corrections, contact the admin to manually update.

**Q: Does this work for wellness metrics?**
A: Yes! Examples:
- `mom 5000 steps at 10:00 am`
- `mom sleep 8 at 11:00 pm`
- `mom energy 7 at 3:00 pm`

## Summary

- **With time:** `30 ml formula at 2:30 pm` → metric saved at 14:30:00
- **Without time:** `30 ml formula` → metric saved at current time
- **All metrics supported:** Formula, sleep, vaccine, diaper, wellness metrics, etc.
- **Flexible formats:** "at 2:30 pm", "2:30 pm", "14:30", "at 14:30" all work
- **Dashboard ready:** Dashboard can now show when feeds/metrics occurred

