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
  
  // breastmilk variations
  if (lower.includes('breastmilk') || (lower.includes('breast') && lower.match(/\d+/))) {
    const match = lower.match(/(\d+)\s*ml?/);
    if (match) {
      return { type: 'breastmilk', value: parseInt(match[1]), unit: 'ml' };
    }
  }
  
  // formula variations
  if (lower.includes('formula')) {
    const match = lower.match(/(\d+)\s*ml?/);
    if (match) {
      return { type: 'formula', value: parseInt(match[1]), unit: 'ml' };
    }
  }
  
  // potty - any variation
  if (lower.includes('potty')) {
    return { type: 'potty', value: 1, unit: 'count' };
  }
  
  // diaper - any variation
  if (lower.includes('diaper') || lower.includes('nappy')) {
    return { type: 'diaper', value: 1, unit: 'count' };
  }
  
  // bath - any variation
  if (lower.includes('bath') || lower.includes('shower')) {
    return { type: 'bath', value: 1, unit: 'done' };
  }
  
  // oil - any variation
  if (lower.includes('oil') || lower.includes('massage')) {
    return { type: 'oil', value: 1, unit: 'done' };
  }
  
  // weight - only if it's a number like "5kg" not an ordinal like "2nd"
  if (lower.includes('weight') && !lower.includes('next') && !lower.includes('appt')) {
    const match = lower.match(/weight\s+(\d+\.?\d*)(?![a-z])\s*(kg|g|lbs)?/);
    if (match && !lower.match(/\d+(?:st|nd|rd|th)/)) {
      return { 
        type: 'weight', 
        value: parseFloat(match[1]), 
        unit: match[2] || 'kg' 
      };
    }
  }
  
  // fever - flexible format
  if (lower.includes('fever') || lower.includes('temp')) {
    const match = lower.match(/(\d+\.?\d*)\s*([cf])?/);
    if (match) {
      return { 
        type: 'fever', 
        value: parseFloat(match[1]), 
        unit: match[2] || 'f' 
      };
    }
  }
  
  // vaccine - any mention with date
  if (lower.includes('vaccine')) {
    const dateMatch = lower.match(/(\d{1,2}(?:st|nd|rd|th)?)\s*(?:of\s+)?(\w+)?/);
    let value = 'Vaccine recorded';
    if (dateMatch) {
      value = `${dateMatch[1]}${dateMatch[2] ? ' ' + dateMatch[2] : ''}`;
    }
    return { 
      type: 'vaccine', 
      value: value,
      unit: 'given' 
    };
  }
  
  // doc notes - flexible
  if (lower.includes('doc') || lower.includes('doctor') || lower.includes('notes')) {
    const notesMatch = lower.match(/(?:doc|doctor|notes)?\s*(.+)/);
    if (notesMatch && notesMatch[1].length > 2) {
      return { 
        type: 'doc_notes', 
        value: notesMatch[1].trim(),
        unit: 'notes' 
      };
    }
  }
  
  // next appointment/weight - any date/time with month or time
  if ((lower.includes('next') || lower.includes('weight')) && (lower.match(/\d{1,2}/) && (lower.includes('june') || lower.includes('may') || lower.includes('jun') || lower.includes('appt') || lower.match(/\d+:\d+/)))) {
    const dateMatch = lower.match(/(\d{1,2}(?:st|nd|rd|th)?)\s*(?:of\s+)?(\w+)?/);
    const timeMatch = lower.match(/(\d{1,2}:\d{2}|\d{1,2})\s*(?:am|pm)?/);
    
    let value = 'Appointment scheduled';
    if (dateMatch) {
      value = `${dateMatch[1]}${dateMatch[2] ? ' ' + dateMatch[2] : ''}`;
    }
    if (timeMatch) {
      value += ` ${timeMatch[1]}`;
    }
    
    return { 
      type: 'next_appointment', 
      value: value,
      unit: 'scheduled' 
    };
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

    // Split by newlines and process each line
    const lines = messageText.split('\n').filter(line => line.trim().length > 0);
    const results = [];

    for (const line of lines) {
      const metric = parseMetric(line);

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
          console.error('❌ Supabase error:', error);
        } else {
          console.log(`✅ ${metric.type} logged: ${metric.value}${metric.unit}`);
          
          // Build confirmation message
          let confirmText = '';
          switch(metric.type) {
            case 'breastmilk':
              confirmText = `Breastmilk ${metric.value}ml`;
              break;
            case 'formula':
              confirmText = `Formula ${metric.value}ml`;
              break;
            case 'potty':
              confirmText = `Potty`;
              break;
            case 'diaper':
              confirmText = `Diaper`;
              break;
            case 'bath':
              confirmText = `Bath`;
              break;
            case 'oil':
              confirmText = `Oil massage`;
              break;
            case 'weight':
              confirmText = `Weight ${metric.value}${metric.unit}`;
              break;
            case 'fever':
              confirmText = `Fever ${metric.value}°${metric.unit.toUpperCase()}`;
              break;
            case 'vaccine':
              confirmText = `Vaccine: ${metric.value}`;
              break;
            case 'doc_notes':
              confirmText = `Doc notes saved`;
              break;
            case 'next_appointment':
              confirmText = `Appt: ${metric.value}`;
              break;
            default:
              confirmText = `Logged`;
          }
          
          results.push(`✅ ${confirmText}`);
        }
      }
    }

    // Send confirmation
    let confirmMsg = results.length > 0 
      ? `✅ Logged:\n${results.join('\n')}`
      : `📝 Format not recognized.\n\nI track:\n🍼 Breastmilk/Formula ml\n💧 Potty/Diaper\n🛁 Bath/Oil\n⚖️ Weight #kg\n🌡️ Fever #f\n💉 Vaccine date\n📝 Doc notes\n📅 Next appt date time`;

    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: fromPhone,
      body: confirmMsg,
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