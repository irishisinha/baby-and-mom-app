import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

function getLondonHour(now: Date): number {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    hour12: false
  }).format(now);
  return parseInt(hourStr, 10);
}

function getLondonDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(date);
}

export async function GET(request: NextRequest) {
  try {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*');

    const now = new Date();
    const todayDate = getLondonDateStr(now);
    const tomorrowDate = getLondonDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    const notifications = [];

    for (const appt of appointments || []) {
      const apptDateTime = new Date(appt.appointment_date);
      const apptDate = getLondonDateStr(apptDateTime);
      const apptTime = apptDateTime.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });

      if (apptDate === tomorrowDate) {
        notifications.push({
          title: '📅 Appointment Tomorrow',
          message: `${appt.title} at ${apptTime}`,
          type: 'tomorrow'
        });
      }

      if (apptDate === todayDate && (getLondonHour(now) === 8 || getLondonHour(now) === 9)) {
        notifications.push({
          title: '🔔 Appointment Today!',
          message: `${appt.title} at ${apptTime}`,
          type: 'today'
        });
      }
    }

    for (const notif of notifications) {
      try {
        await fetch('https://baby-and-mom-app.vercel.app/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: 'appointments',
            title: notif.title,
            message: notif.message,
            data: { type: 'appointment', subtype: notif.type }
          })
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      notificationsQueued: notifications.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Appointment cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
