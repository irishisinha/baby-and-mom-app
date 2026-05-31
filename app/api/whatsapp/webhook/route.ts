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

function parseMetric(text: string) {
  const lower = text.toLowerCase().trim();
  
  console.log(`Parsing: "${lower}"`);
  
  // Breastmilk
  if (lower.includes('breastmilk')) {
    const num = lower.match(/(\d+)/);
    if (num) {
      return { type: 'breastmilk', value: parseInt(num[1]), unit: 'ml' };
    }
  }
  
  // Formula
  if (lower.includes('formula')) {
    const num = lower.match(/(\d+)/);
    if (num) {
      return { type: 'formula', value: parseInt(num[1]), unit: 'ml' };
    }
  }
  
  // Potty
  if (lower.includes('potty')) {
    return { type: 'potty', value: 1, unit: 'count' };
  }
  
  // Diaper
  if (lower.includes('diaper')) {
    return { type: 'diaper', value: 1, unit: 'count' };
  }
  
  // Bath
  if (lower.includes('bath')) {
    return { type: 'bath', value: 1, unit: 'done' };
  }
  
  // Oil
  if (lower.includes('oil')) {
    return { type: 'oil', value: 1, unit: 'done' };
  }
  
  // Weight (only if NOT "next")
  if (lower.includes('weight') && !lower.includes('next')) {
    const num = lower.match(/(\d+\.?\d*)\s*kg/);
    if (num) {
      return { type: 'weight', value: parseFloat(num[1]), unit: 'kg' };
    }
  }
  
  // Fever
  if (lower.includes('fever')) {
    const num = lower.match(/(\d+\.?\d*)/);
    if (num) {
      return { type: 'fever', value: parseFloat(num[1]), unit: 'f' };
    }
  }
  
  // Vaccine
  if (lower.includes('vaccine')) {
    return { type: 'vaccine', value: 'Vaccine recorded', unit: 'given' };
  }
  
  // Doc notes
  if (lower.includes('doc') || lower.includes('doctor')) {
    return { type: 'doc_notes', value: 'Notes saved', unit: 'notes' };
  }
  
  // Next appointment
  if (lower.includes('next') && (lower.includes('appt') || lower.includes('weight') || lower.includes('june') || lower.includes('may'))) {
    return { type: 'next_appointment', value: 'Appointment set', unit: 'scheduled' };
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageText = formData.get('Body') as string;
    const fromPhone = formData.get('From') as string;
    const phoneNumber = fromPhone?.replace('whatsapp:', '') || '';

    console.log(`📱 Message from ${phoneNumber}: "${messageText}"`);
    console.log(`Phone extracted: "${phoneNumber}"`);

    const lines = messageText.split('\n').filter(l => l.trim());
    const results = [];

    for (const line of lines) {
      const metric = parseMetric(line);
      
      if (metric) {
        console.log(`✅ Matched: ${metric.type} from ${phoneNumber}`);
        
        const { error } = await supabase.from('baby_metrics').insert({
          metric_type: metric.type,
          value: metric.value,
          unit: metric.unit,
          sent_from_phone: phoneNumber,
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error('❌ DB Error:', error);
        } else {
          results.push(`✅ ${metric.type}`);
        }
      }
    }

    const reply = results.length > 0 
      ? `Logged:\n${results.join('\n')}\n\nFrom: ${phoneNumber}`
      : `Not recognized\n\nFrom: ${phoneNumber}`;

    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: fromPhone,
      body: reply,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}