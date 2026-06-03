const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://ucdopufzxyiggsgwtzus.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZG9wdWZ6eHlpZ2dzZ3d0enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NjU2MDAsImV4cCI6MjAxODU0MTYwMH0.XtqN0JYJJfvqb5xJD_JglBx7xpFeCSDvGb3J4OP9KS4"
);

async function checkTokens() {
  const { data, error } = await supabase
    .from("family_device_tokens")
    .select("*")
    .limit(20);

  if (error) {
    console.error("Error fetching tokens:", error.message);
    return;
  }

  console.log("✅ REGISTERED DEVICE TOKENS:");
  console.log("════════════════════════════════════════════════════════════════════════════════");
  
  if (!data || data.length === 0) {
    console.log("No device tokens registered yet");
  } else {
    data.forEach((token, idx) => {
      console.log(`${idx + 1}. Device: ${token.device_name || 'Unknown'} | Registered: ${new Date(token.created_at).toLocaleString('en-IN')}`);
    });
  }
  console.log("════════════════════════════════════════════════════════════════════════════════");
}

checkTokens();
