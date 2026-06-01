import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test basic query first
    const { data: test } = await supabase.from('families').select('id').limit(1);
    
    console.log('✅ Supabase connection OK');

    return NextResponse.json({ 
      success: true, 
      message: 'Setup endpoint ready. Use Supabase SQL editor to run: CREATE TABLE public.appointments...',
      instruction: 'Go to Supabase Console > SQL Editor and run the provided SQL'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
