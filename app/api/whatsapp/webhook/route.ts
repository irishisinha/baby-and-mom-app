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
  if (lower.includes('breastmilk') || lower.includes('breast ')) {
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
  
  // weight - flexible format
  if (lower.includes('weight')) {
    const match = lower.match(/(\d+\.?\d*)\s*(kg|g)?/);
    if (match) {
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
  
  // vaccine - flexible format
  if (lower.includes('vaccine')) {
    const dateMatch = lower.match(/(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}))/);
    const timeMatch = lower.match(/(\d{1,2}:\d{2}|\d{1,2})\s*(?:am|pm)?/);
    
    let value = 'Vaccine recorded';
    if (dateMatch) value = `${dateMatch[1]}`;
    if (timeMatch) value += ` ${timeMatch[1]}`;
    
    return { 
      type: 'vaccine', 
      value: value,
      unit: 'given' 
    };
  }
  
  // doc notes - flexible
  if (lower.includes('doc') || lower.includes('doctor') || lower.includes('notes')) {
    const notesMatch = lower.match(/(?:doc|doctor|notes)\s+(.+)/);
    if (notesMatch) {
      return { 
        type: 'doc_notes', 
        value: notesMatch[1].trim(),
        unit: 'notes' 
      };
    }
  }
  
  // next appointment - flexible
  if (lower.includes('next') && (lower.includes('appt') || lower.includes('appointment'))) {
    const dateMatch = lower.match(/(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}))/);
    const timeMatch = lower.match(/(\d{1,2}:\d{2}|\d{1,2})\s*(?:am|pm)?/);
    
    let value = 'Appointment scheduled';
    if (dateMatch) value = `${dateMatch[1]}`;
    if (timeMatch) value += ` ${timeMatch[1]}`;
    
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
        console.error('❌ Supabase error:', error);
      } else {
        console.log(`✅ ${metric.type} logged: ${metric.value}${metric.unit}`);
      }

      // Send confirmation
      let confirmMsg = `✅ Logged: `;
      
      switch(metric.type) {
        case 'breastmilk':
          confirmMsg += `Breastmilk ${metric.value}ml`;
          break;
        case 'formula':
          confirmMsg += `Formula ${metric.value}ml`;
          break;
        case 'potty':
          confirmMsg += `Potty logged`;
          break;
        case 'diaper':
          confirmMsg += `Diaper changed`;
          break;
        case 'bath':
          confirmMsg += `Bath done`;
          break;
        case 'oil':
          confirmMsg += `Oil massage done`;
          break;
        case 'weight':
          confirmMsg += `Weight ${metric.value}${metric.unit}`;
          break;
        case 'fever':
          confirmMsg += `Fever ${metric.value}°${metric.unit.toUpperCase()}`;
          break;
        case 'vaccine':
          confirmMsg += `Vaccine: ${metric.value}`;
          break;
        case 'doc_notes':
          confirmMsg += `Doctor notes saved`;
          break;
        case 'next_appointment':
          confirmMsg += `Appointment: ${metric.value}`;
          break;
        default:
          confirmMsg += `Data recorded`;
      }

      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: fromPhone,
        body: confirmMsg,
      });
    } else {
      // Unknown format - send help message
      const helpMsg = `📝 I can track:

🍼 Breastmilk 100ml / Formula 150ml
💧 Potty / Diaper
🛁 Bath / Oil massage
⚖️ Weight 5kg
🌡️ Fever 101f
💉 Vaccine 9th june
📝 Doc notes baby is healthy
📅 Next appt 2nd June 9:00`;

      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: fromPhone,
        body: helpMsg,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}