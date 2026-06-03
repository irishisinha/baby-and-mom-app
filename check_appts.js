const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://ucdopufzxyiggsgwtzus.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZG9wdWZ6eHlpZ2dzZ3d0enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NjU2MDAsImV4cCI6MjAxODU0MTYwMH0.XtqN0JYJJfvqb5xJD_JglBx7xpFeCSDvGb3J4OP9KS4"
);

async function check() {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    console.log("✅ ALL APPOINTMENTS:");
    console.log("════════════════════════════════════════════════════════════════════════════════");
    if (data && data.length > 0) {
      data.forEach(apt => {
        console.log(`📅 ${apt.appointment_date} ${apt.appointment_time} | ${apt.reason || apt.doctor || 'N/A'} | Created: ${apt.created_at}`);
      });
    } else {
      console.log("No appointments found");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

check();
