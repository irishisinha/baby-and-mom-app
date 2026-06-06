import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const AUTHORIZED_NUMBERS = ['+919604898762', '+919871319008', '+919914789171'];
const FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
const BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';

function parseAppointmentMessage(text: string): any {
  const appointmentMatch = text.match(/^Appointment-\s*(.+)$/i);
  if (!appointmentMatch) return null;

  const content = appointmentMatch[1].trim();
  const detailsMatch = content.match(/^(.+?)\s+(\d{1,2})\s+(\w+)\s+(\d{1,2}):(\d{2})\s*(am|pm)\s+(.+)$/i);
  
  if (!detailsMatch) return null;

  const [, description, day, month, hour, minute, ampm, title] = detailsMatch;
  
  let hours = parseInt(hour);
  if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const monthMap: { [key: string]: number } = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  
  const monthNum = monthMap[month.toLowerCase()];
  if (!monthNum) return null;

  const dateStr = `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${minute}:00`;
  const isoDateTime = `${dateStr}T${timeStr}`;

  return {
    title: title.trim(),
    description: description.trim(),
    appointment_date: isoDateTime,
    isAppointment: true
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    const messageBody = params.get('Body') || '';
    const fromPhone = params.get('From') || '';

    console.log('[WA-MSG]', { messageBody, fromPhone });

    if (!AUTHORIZED_NUMBERS.includes(fromPhone)) {
      const response = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Not authorized</Message></Response>';
      return new NextResponse(response, { status: 403, headers: { 'Content-Type': 'application/xml' } });
    }

    const appointmentData = parseAppointmentMessage(messageBody);
    console.log('[WA-PARSED]', appointmentData);

    if (appointmentData && appointmentData.isAppointment) {
      try {
        const appointmentDateObj = new Date(appointmentData.appointment_date);
        const dateOnly = appointmentDateObj.toISOString().split('T')[0];
        const timeOnly = appointmentDateObj.toISOString().split('T')[1].substring(0, 5);

        const { data, error } = await supabase
          .from('appointments')
          .insert({
            user_id: 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6',
            doctor: appointmentData.title,
            reason: appointmentData.description,
            appointment_date: dateOnly,
            appointment_time: timeOnly,
            appointee_for: appointmentData.description,
            notes: `Created via WhatsApp from ${fromPhone}`
          })
          .select();

        console.log('[WA-INSERT]', { data, error });

        if (error) throw error;

        const response = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Appointment logged: ${appointmentData.title} - ${appointmentData.description}</Message></Response>`;
        return new NextResponse(response, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' }
        });
      } catch (dbError: any) {
        console.error('[APPOINTMENT-ERROR]', dbError);
        const errMsg = dbError?.message || String(dbError) || 'Unknown error';
        const response = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error: ${errMsg.substring(0, 50)}</Message></Response>`;
        return new NextResponse(response, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' }
        });
      }
    }

    const helpResponse = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Format: Appointment- [name] [date] [time] [type] | Example: Appointment- Jaian 9 June 3:20 pm Vaccination</Message></Response>';
    return new NextResponse(helpResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    console.error('[WHATSAPP-ERROR]', error);
    const errorResponse = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing message</Message></Response>';
    return new NextResponse(errorResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
