const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://ucdopufzxyiggsgwtzus.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZG9wdWZ6eHlpZ2dzd3d0enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NjU2MDAsImV4cCI6MjAxODU0MTYwMH0.XtqN0JYJJfvqb5xJD_JglBx7xpFeCSDvGb3J4OP9KS4"
);

async function test() {
  // Test inserting a simple appointment
  const { data, error } = await supabase.from('appointments').insert({
    user_id: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6',
    doctor: 'Test Doctor',
    reason: 'Test Appointment',
    appointment_date: '2026-06-04',
    appointment_time: '5:00 pm',
    notes: 'Test from CLI'
  });

  if (error) {
    console.log('ERROR:', error.message);
  } else {
    console.log('SUCCESS! Appointment inserted:', data);
  }
}

test();
