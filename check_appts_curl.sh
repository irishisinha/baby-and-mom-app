#!/bin/bash
RESPONSE=$(curl -s -X GET \
  "https://ucdopufzxyiggsgwtzus.supabase.co/rest/v1/appointments?order=created_at.desc&limit=10" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZG9wdWZ6eHlpZ2dzd3d0enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NjU2MDAsImV4cCI6MjAxODU0MTYwMH0.XtqN0JYJJfvqb5xJD_JglBx7xpFeCSDvGb3J4OP9KS4")

echo "✅ LATEST APPOINTMENTS:"
echo "════════════════════════════════════════════════════════════"

# Check if response contains appointment data
if echo "$RESPONSE" | grep -q "appointment_date"; then
  echo "$RESPONSE" | grep -o '"appointment_date":"[^"]*"' | head -5
  echo "✓ Appointments found!"
else
  echo "Checking for response: $RESPONSE" | head -50
fi
