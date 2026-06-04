import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get the user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${email}. Setup users first.` },
        { status: 404 }
      );
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(16).toString('hex');

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Create login URL with email and password encoded
    const loginUrl = new URL(`${request.nextUrl.origin}/auth/password-login`);
    loginUrl.searchParams.set('email', email);
    loginUrl.searchParams.set('password', tempPassword);

    return NextResponse.json({
      success: true,
      email,
      loginUrl: loginUrl.toString(),
      message: 'Click the link below to login'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
