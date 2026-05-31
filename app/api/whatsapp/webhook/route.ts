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
  
  // breastmilk 100ml or breast 100
  const breastMatch = lower.match(/breast(?:milk)?\s+(\d+)\s*ml?/);
  if (breastMatch) {
    return { type: 'breastmilk', value: parseInt(breastMatch[1]), unit: 'ml' };
  }
  
  // formula 150ml or formula 150
  const formulaMatch = lower.match(/formula\s+(\d+)\s*ml?/);
  if (formulaMatch) {
    return { type: 'formula', value: parseInt(formulaMatch[1]), unit: 'ml' };
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
  
  // oil done
  if (lower.includes('oil')) {
    return { type: 'oil', value: 1, unit: 'done' };
  }
  
  // weight 5.2kg or weight 5200g
  const weightMatch = lower.match(/weight\s+(\d+\.?\d*)\s*(kg|g)?/);
  if (weightMatch) {
    const unit = weightMatch[2] || 'kg';
    return { 
      type: 'weight', 
      value: parseFloat(weightMatch[1]), 
      unit: unit 
    };
  }
  
  // fever 101.5 or fever 38.5c
  const feverMatch = lower.match(/fever\s+(\d+\.?\d*)\s*([cf])?/);
  if (feverMatch) {
    return { 
      type: 'fever', 
      value: parseFloat(feverMatch[1]), 
      unit: feverMatch[2] || 'f' 
    };
  }
  
  // vaccine polio 05/31 10:30am
  const vaccineMatch = lower.match(/vaccine\s+(\w+)\s+([0-9\/]+)\s+([0-9:]+(?:am|pm)?)/);
  if (vaccineMatch) {
    return { 
      type: 'vaccine', 
      value: `${vaccineMatch[1]} - ${vaccineMatch[2]} ${vaccineMatch[3]}`,
      unit: 'given' 
    };
  }
  
  // doctor notes check up went well, baby is healthy
  const docNotesMatch = lower.match(/(?:doc|doctor)\s+notes?\s+(.+)/);
  if (docNotesMatch) {
    return { 
      type: 'doc_notes', 
      value: docNotesMatch[1].trim(),
      unit: 'notes' 
    };
  }
  
  // next appt 06/15 2:30pm dr sharma
  const apptMatch = lower.match(/next\s+(?:appt|appointment)\s+([0-9\/]+)\s+([0-9:]+(?:am|pm)?)\s*(.+)?/);
  if (apptMatch) {
    return { 
      type: 'next_appointment', 
      value: `${apptMatch[1]} at ${apptMatch[2]}${apptMatch[3] ? ' - ' + apptMatch[3].trim() : ''}`,
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
      const helpMsg = `📝 Format help:
🍼 breastmilk 100ml
🍼 formula 150ml
💧 potty
🧻 diaper
🛁 bath
🛢️ oil done
⚖️ weight 5.2kg
🌡️ fever 101.5f
💉 vaccine polio 05/31 10:30am
📝 doc notes check up went well
📅 next appt 06/15 2:30pm dr sharma`;

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