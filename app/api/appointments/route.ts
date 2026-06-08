import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';
const BABY_ID = 'e8a7c56c-62c6-442c-94ac-518928c8c07b';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('[GET-APPT-ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[GET-APPT-ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Support multiple field naming conventions
    const doctor = body.doctor || body.title || '';
    const reason = body.reason || body.description || '';
    let appointmentDate = body.appointment_date || body.appointment_date_time || '';
    const appointmentTime = body.appointment_time || '';

    // Extract date from datetime if needed
    if (appointmentDate.includes('T')) {
      appointmentDate = appointmentDate.split('T')[0];
    }

    if (!doctor || !appointmentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: doctor/title, appointment_date' }, 
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Insert with all possible field combinations
    const insertData: any = {
      doctor,
      reason,
      appointment_date: appointmentDate,
      appointee_for: 'baby',
      notes: 'Created via app',
    };

    // Add appointment_time if provided
    if (appointmentTime) {
      insertData.appointment_time = appointmentTime;
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([insertData])
      .select();

    if (error) {
      console.error('[INSERT-APPT-ERROR]', error, 'Data:', insertData);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[POST-APPT-ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
