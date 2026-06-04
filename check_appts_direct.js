const fetch = require('node-fetch');

const url = 'https://ucdopufzxyiggsgwtzus.supabase.co/rest/v1/appointments?order=created_at.desc&limit=10';
const headers = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZG9wdWZ6eHlpZ2dzZ3d0enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NjU2MDAsImV4cCI6MjAxODU0MTYwMH0.XtqN0JYJJfvqb5xJD_JglBx7xpFeCSDvGb3J4OP9KS4',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZG9wdWZ6eHlpZ2dzd3d0enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NjU2MDAsImV4cCI6MjAxODU0MTYwMH0.XtqN0JYJJfvqb5xJD_JglBx7xpFeCSDvGb3J4OP9KS4'
};

fetch(url, { headers })
  .then(r => r.json())
  .then(data => {
    console.log('✅ LATEST APPOINTMENTS:');
    console.log('════════════════════════════════════════════════════════════');
    if (data.length === 0) {
      console.log('No appointments found');
    } else {
      data.forEach(apt => {
        console.log(`${apt.appointment_date} ${apt.appointment_time} | ${apt.appointee_for || 'N/A'} | ${apt.reason || 'N/A'}`);
      });
    }
  })
  .catch(err => console.log('Error:', err.message));
