SELECT id, appointee_for, doctor, reason, appointment_date, appointment_time, created_at 
FROM appointments 
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
