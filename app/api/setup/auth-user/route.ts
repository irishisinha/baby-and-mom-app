import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, name, relationship } = await request.json();

    if (!email || !name || !relationship) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-12),
      email_confirm: true,
      user_metadata: { name, relationship }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Create profile (ignore if exists)
    try {
      await supabase.from('profiles').insert({
        id: userId,
        name,
        setup_completed: true,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.log('Profile already exists or error');
    }

    // Link to family_members
    try {
      await supabase
        .from('family_members')
        .update({ user_id: userId })
        .eq('name', name);
    } catch (err) {
      console.log('Family link skipped');
    }

    return NextResponse.json({
      success: true,
      message: `✅ ${name} is ready to login!`,
      email
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
