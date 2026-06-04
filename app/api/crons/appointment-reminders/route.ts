import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*');

    const now = new Date();
    const todayDate = now.toLocaleDateString();
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString();

    const notifications = [];

    for (const appt of appointments || []) {
      const apptDate = new Date(appt.appointment_date).toLocaleDateString();
      const apptHour = new Date(appt.appointment_date).getHours();

      if (apptDate === tomorrowDate) {
        notifications.push({
          title: '📅 Appointment Tomorrow',
          message: `${appt.title} at ${apptHour}:00`,
          type: 'tomorrow'
        });
      }

      if (apptDate === todayDate && (now.getHours() === 8 || now.getHours() === 9)) {
        notifications.push({
          title: '🔔 Appointment Today!',
          message: `${appt.title} at ${apptHour}:00`,
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
