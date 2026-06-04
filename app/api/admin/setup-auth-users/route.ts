import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Emails array is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const results: any[] = [];

    for (const email of emails) {
      try {
        // First try to get the user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);

        if (existingUser) {
          results.push({
            email,
            status: 'already_exists',
            userId: existingUser.id
          });
          continue;
        }

        // Create new auth user
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          password: Math.random().toString(36).slice(-12) // Temporary password
        });

        if (error) {
          results.push({
            email,
            status: 'error',
            error: error.message
          });
        } else {
          results.push({
            email,
            status: 'created',
            userId: data?.user?.id
          });
        }
      } catch (err: any) {
        results.push({
          email,
          status: 'error',
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
