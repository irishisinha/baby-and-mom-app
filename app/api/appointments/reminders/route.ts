import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';

function getLondonTime(): Date {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  return londonTime;
}

async function sendTwilioMessage(to: string, message: string): Promise<void> {
  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);
    await client.messages.create({
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${to}`,
      body: message,
    });
  } catch (error) {
    console.error(`Failed to send message to ${to}:`, error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const london = getLondonTime();
    const today = new Date(london);
    today.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('appointment_date', today.toISOString())
      .lte('appointment_date', tomorrowStart.toISOString());

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      return Response.json({ success: true, reminded: 0 });
    }

    let remindersSent = 0;

    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.appointment_date);
      const timeDiffMs = appointmentDate.getTime() - london.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      // Reminder 1 day before
      if (timeDiffHours >= 23 && timeDiffHours <= 25) {
        const { data: members } = await supabase
          .from('family_members')
          .select('whatsapp_number')
          .eq('family_id', appointment.family_id);

        if (members) {
          for (const member of members) {
            if (member.whatsapp_number) {
              const msg = `📅 Appointment tomorrow at ${appointmentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}\n${appointment.doctor_name || 'Doctor'}\n${appointment.location || 'Location TBD'}`;
              await sendTwilioMessage(member.whatsapp_number, msg);
              remindersSent++;
            }
          }
        }
      }

      // Reminder on day of appointment
      if (timeDiffHours >= -1 && timeDiffHours <= 1) {
        const { data: members } = await supabase
          .from('family_members')
          .select('whatsapp_number')
          .eq('family_id', appointment.family_id);

        if (members) {
          for (const member of members) {
            if (member.whatsapp_number) {
              const msg = `🏥 Today's appointment at ${appointmentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}\n${appointment.doctor_name || 'Doctor'}\n${appointment.location || 'Location TBD'}`;
              await sendTwilioMessage(member.whatsapp_number, msg);
              remindersSent++;
            }
          }
        }
      }
    }

    return Response.json({ success: true, reminded: remindersSent });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
