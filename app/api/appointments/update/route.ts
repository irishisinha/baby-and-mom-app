import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, doctor, reason, appointment_date, appointment_time, appointee_for, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        doctor,
        reason,
        appointment_date,
        appointment_time,
        appointee_for,
        notes
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error('[UPDATE-APPT-ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
