SELECT id, appointee_for, doctor, reason, appointment_date, appointment_time, created_at 
FROM appointments 
WHERE appointment_date = '2026-06-04'
ORDER BY created_at DESC
LIMIT 10;
