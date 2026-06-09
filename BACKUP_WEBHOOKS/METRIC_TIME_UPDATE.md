# Add Time Tracking to Metrics

## Database Migration

Add a new column to the `baby_metrics` table to track when the feed/metric occurred:

```sql
ALTER TABLE baby_metrics 
ADD COLUMN metric_time TIME DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN baby_metrics.metric_time IS 'Time the metric was recorded (e.g., feed time, sleep time). Extracted from message or uses message timestamp if not specified.';
```

## What This Enables

Users can now specify the time when logging metrics:

**With explicit time:**
- `30 ml formula at 2:30 pm`
- `30 ml formula 2:30pm`
- `formula 30ml 14:30`
- `sleep 2 hours at 10pm`

**Without time (uses message timestamp):**
- `30 ml formula`
- `sleep 2 hours`

## Message Format Examples

### Formula with time
- `30 ml formula at 2:30 pm`
- `30 ml formula 2:30 pm`
- `formula 30 ml at 14:30`
- `30ml formula 14:30`

### Sleep with time
- `sleep 2 hours at 10:15 pm`
- `sleep 2h 10:15pm`
- `2 hours sleep at 22:15`

### Without time (auto-uses current time)
- `30 ml formula` → uses current time
- `sleep 2 hours` → uses current time

## Database Response

When saved, the metric will include:

```json
{
  "metric_type": "formula",
  "value": "30",
  "unit": "ml",
  "metric_time": "14:30:00",
  "created_at": "2026-06-09T14:30:00+01:00"
}
```

## Webhook Code Changes

The parseMetric function now:
1. Extracts time from message text using regex patterns
2. Normalizes time to HH:MM:SS format
3. Falls back to message timestamp if no time found
4. Returns time in the metric object
5. Database insert includes the metric_time field

## Testing

After deployment, test with:

```
Send: 30 ml formula at 2:30 pm
Expected: Saves formula with time 14:30:00

Send: sleep 2 hours
Expected: Saves sleep with current time

Send: 30 ml formula 10:15 am
Expected: Saves formula with time 10:15:00
```

## Backward Compatibility

- Old metrics without times will have NULL metric_time
- New metrics always include metric_time (current time if not specified)
- Queries can filter: `WHERE metric_time IS NOT NULL`

