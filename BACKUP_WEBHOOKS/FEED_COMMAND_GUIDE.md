# Feed Command - Daily Feed Summary

## Overview

The `feed` command returns a summary of all formula and breastmilk feeds logged for today, including the time each feed was given.

## How to Use

Simply send:
```
feed
```

## What You Get

The system returns:
- List of all feeds (formula & breastmilk) for today
- Time each feed was given
- Total amount by feed type
- Total number of feeds

## Example Response

**User sends:** `feed`

**Response:**
```
Today's Feeds - 2026-06-09

1. Formula: 30ml at 08:00
2. Breastmilk: 50ml at 12:00
3. Formula: 45ml at 14:30
4. Breastmilk: 60ml at 17:45

Summary:
  Formula: 75ml
  Breastmilk: 110ml
  Total Feeds: 4
```

## When to Use

Perfect for:
- Checking daily feed intake at a glance
- Verifying you logged all feeds
- Monitoring feeding schedule
- Shared family updates (grandparents, partners)

## Feed Types Tracked

✓ **Formula** - logged as "X ml formula"
✓ **Breastmilk** - logged as "pumped X ml" or "breast milk X ml"

## Time Format

Times are displayed in 24-hour format (HH:MM):
- 08:00 = 8:00 AM
- 14:30 = 2:30 PM
- 22:15 = 10:15 PM

## Examples

### Morning Check
```
Send: feed
Response: Shows all feeds from today

Result shows:
- Breakfast feed at 08:00
- Mid-morning at 10:30
- Lunch at 12:00
```

### Evening Summary
```
Send: feed
Response: All feeds logged throughout the day

Shows feeding pattern and total intake
```

### No Feeds Yet
```
Send: feed
Response: "No feeds logged today"

(Will show feeds once any are logged)
```

## Tips

✓ **Use anytime** - Check feeds at any point during the day

✓ **Time accuracy** - Times show when feed was logged or as specified in message

✓ **Sharing** - Easy way to report to partner or grandparents

✓ **Pattern tracking** - Use daily to identify feeding schedule

## Data Displayed

**Per Feed:**
- Sequence number (1, 2, 3...)
- Feed type (Formula or Breastmilk)
- Amount given
- Time of feed

**Summary:**
- Total formula
- Total breastmilk
- Total number of feeds

## Time Source

Times come from:
1. **If specified in message:** Time you included (e.g., "30 ml formula at 2:30 pm")
2. **If not specified:** Message timestamp (current time)
3. **Timezone:** Always Europe/London (GMT+1)

## Timezone Note

All times automatically convert to Europe/London timezone. Even if you send messages from a different timezone, times display in London time.

## Comparison with Other Commands

| Command | Returns | Shows Time | Applies To |
|---------|---------|-----------|-----------|
| `feed` | All feeds today | YES | Formula & Breastmilk only |
| `report` | All metrics today | NO | All baby metrics |
| `appt` | Upcoming appointments | YES | Appointments only |

## Integration with Dashboard

The `feed` command data can also be:
- Viewed on the dashboard
- Filtered by time range
- Tracked over multiple days
- Analyzed for patterns

## Troubleshooting

**Q: No feeds showing even though I logged them?**
A: Check if feeds were logged as "formula" or "breastmilk". Other feed types (like "food") won't appear. Also verify they were logged today (not yesterday).

**Q: Why is the time different?**
A: Times convert to Europe/London timezone. If you're in a different zone, you'll see the London equivalent.

**Q: Can I get feeds from a different day?**
A: Currently `feed` shows only today's feeds. For historical data, check the dashboard.

**Q: Does it include water or other drinks?**
A: No, only formula and breastmilk. Other nutrition items are tracked separately.

## Summary

The `feed` command provides a quick snapshot of your baby's feeding for the day:

- **Easy to use:** Just send `feed`
- **Time-aware:** Shows when each feed occurred
- **Comprehensive:** Lists all formula & breastmilk feeds
- **Quick summary:** Total intake and feed count
- **Anytime access:** Check at any point during day

Perfect for tracking feeding patterns and daily intake!

