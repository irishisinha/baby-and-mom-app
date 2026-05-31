import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Parse metric from message
function parseMetric(text: string) {
  const lower = text.toLowerCase().trim();
  
  // milk 200ml, milk 200
  const milkMatch = lower.match(/milk\s+(\d+)\s*ml?/);
  if (milkMatch) {
    return { type: 'milk', value: parseInt(milkMatch[1]), unit: 'ml' };
  }
  
  // potty
  if (lower.includes('potty')) {
    return { type: 'potty', value: 1, unit: 'count' };
  }
  
  // diaper
  if (lower.includes('diaper')) {
    return { type: 'diaper', value: 1, unit: 'count' };
  }
  
  // bath done
  if (lower.includes('bath')) {
    return { type: 'bath', value: 1, unit: 'done' };
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageText = formData.get('Body') as string;
    const fromPhone = formData.get('From') as string;
    const phoneNumber = fromPhone?.replace('whatsapp:', '') || '';

    console.log(`📱 Message from ${phoneNumber}: ${messageText}`);

    // Parse metric
    const metric = parseMetric(messageText);

    if (metric) {
      // Save to baby_metrics table
      const { error } = await supabase
        .from('baby_metrics')
        .insert([
          {
            metric_type: metric.type,
            value: metric.value,
            unit: metric.unit,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('Supabase error:', error);
      } else {
        console.log(`✅ ${metric.type} logged: ${metric.value}${metric.unit}`);
      }

      // Send confirmation
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: fromPhone,
        body: `✅ Logged: ${metric.type} - ${metric.value}${metric.unit}`,
      });
    } else {
      // Unknown format
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: fromPhone,
        body: `📝 Format: "milk 200ml" or "potty" or "diaper" or "bath"`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}