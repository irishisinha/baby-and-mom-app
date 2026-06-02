-- Check if appointments table exists
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%appoint%';

-- Check baby_metrics with next_appointment
SELECT metric_type, COUNT(*) FROM baby_metrics WHERE metric_type LIKE '%appoint%' GROUP BY metric_type;

-- Check recent appointment records
SELECT * FROM baby_metrics WHERE metric_type LIKE '%appoint%' ORDER BY created_at DESC LIMIT 10;
