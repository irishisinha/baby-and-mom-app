# 📱 WhatsApp Commands Reference

## FEED Command
Send: `feed`

Response:
```
Today's Feeds - 2026-06-10

1. Formula: 90ml at 02:47
2. Formula: 90ml at 07:52
...
9. Formula: 100ml at 14:15

Summary:
  Formula: 520ml
  Breastmilk: 30ml
  Total Feeds: 9
```

## REPORT Command
Send: `report`

Response:
```
📊 Jaian (Baby) - Today vs Yesterday

Today (2026-06-10):
  formula: 520 (yesterday: 890)
  breastmilk: 30 (yesterday: 48)
  vaccine: 0 (yesterday: 2)
  potty: 0 (yesterday: 3)
  bath: 0 (yesterday: 1)
```

## Metric Logging
Send: `30ml formula` or `5.5kg weight`

Supported:
- formula (ml)
- breastmilk (ml)
- weight (kg)
- vaccine
- potty
- bath

## Webhook
URL: https://baby-and-mom-app.vercel.app/api/whatsapp
