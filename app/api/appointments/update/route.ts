import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, doctor, title, reason, description, appointment_date, appointment_time } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const updateData: any = {};
    
    if (doctor || title) updateData.doctor = doctor || title;
    if (reason || description) updateData.reason = reason || description;
    if (appointment_date) {
      updateData.appointment_date = appointment_date.includes('T') 
        ? appointment_date.split('T')[0] 
        : appointment_date;
    }
    if (appointment_time) updateData.appointment_time = appointment_time;

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[UPDATE-APPT-ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[PUT-APPT-ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
