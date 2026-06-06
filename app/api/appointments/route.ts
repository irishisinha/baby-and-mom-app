import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { 
        auth: { persistSession: false } 
      }
    );

    const { data, error } = await supabase
      .from('appointments')
      .select('*', { count: 'estimated' })
      .order('appointment_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { family_id, baby_id, title, description, appointment_date } = body;

    if (!family_id || !baby_id || !title || !appointment_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        family_id,
        baby_id,
        title,
        description: description || '',
        appointment_date,
        notes: ''
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[APPT-ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
