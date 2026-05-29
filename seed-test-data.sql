-- This script adds test data to your Supabase for dashboard testing

-- First, get your user ID (you'll need to manually set this from Supabase Auth)
-- Replace 'YOUR_USER_ID' with your actual user ID from the users table

-- Add a test family
INSERT INTO families (name, country, timezone, created_by)
VALUES ('Test Family', 'US', 'America/New_York', 'YOUR_USER_ID')
ON CONFLICT DO NOTHING;

-- Get the family ID (you'll need to adjust this)
-- For now, we'll use a placeholder and you can update it

-- Add a test baby
INSERT INTO babies (family_id, name, date_of_birth, created_by)
VALUES (
  (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1),
  'Baby Emma',
  '2024-01-15',
  'YOUR_USER_ID'
)
ON CONFLICT DO NOTHING;

-- Add test baby events (feeds)
INSERT INTO baby_events (baby_id, family_id, type, value, unit, occurred_at, created_by)
SELECT 
  (SELECT id FROM babies WHERE name = 'Baby Emma' LIMIT 1),
  (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1),
  'feed',
  60,
  'ml',
  NOW() - INTERVAL '2 hours',
  'YOUR_USER_ID'
WHERE EXISTS (SELECT 1 FROM babies WHERE name = 'Baby Emma' LIMIT 1);

INSERT INTO baby_events (baby_id, family_id, type, value, unit, occurred_at, created_by)
SELECT 
  (SELECT id FROM babies WHERE name = 'Baby Emma' LIMIT 1),
  (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1),
  'diaper',
  1,
  'count',
  NOW() - INTERVAL '1 hour',
  'YOUR_USER_ID'
WHERE EXISTS (SELECT 1 FROM babies WHERE name = 'Baby Emma' LIMIT 1);

INSERT INTO baby_events (baby_id, family_id, type, value, unit, occurred_at, created_by)
SELECT 
  (SELECT id FROM babies WHERE name = 'Baby Emma' LIMIT 1),
  (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1),
  'sleep',
  120,
  'minutes',
  NOW() - INTERVAL '30 minutes',
  'YOUR_USER_ID'
WHERE EXISTS (SELECT 1 FROM babies WHERE name = 'Baby Emma' LIMIT 1);

-- Add test mother events
INSERT INTO mother_events (mother_id, family_id, type, value, unit, occurred_at, created_by)
SELECT 
  (SELECT id FROM mothers WHERE family_id = (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1) LIMIT 1),
  (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1),
  'mood',
  7,
  'scale',
  NOW() - INTERVAL '3 hours',
  'YOUR_USER_ID'
WHERE EXISTS (SELECT 1 FROM mothers WHERE family_id = (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1) LIMIT 1);

INSERT INTO mother_events (mother_id, family_id, type, value, unit, occurred_at, created_by)
SELECT 
  (SELECT id FROM mothers WHERE family_id = (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1) LIMIT 1),
  (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1),
  'water',
  250,
  'ml',
  NOW() - INTERVAL '1 hour',
  'YOUR_USER_ID'
WHERE EXISTS (SELECT 1 FROM mothers WHERE family_id = (SELECT id FROM families WHERE name = 'Test Family' LIMIT 1) LIMIT 1);
