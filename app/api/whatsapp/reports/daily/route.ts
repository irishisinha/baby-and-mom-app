import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

function getLondonDate(daysAgo = 0) {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  londonTime.setDate(londonTime.getDate() - daysAgo);
  
  const year = londonTime.getFullYear();
  const month = String(londonTime.getMonth() + 1).padStart(2, '0');
  const day = String(londonTime.getDate()).padStart(2, '0');
  
  return { 
    date: `${year}-${month}-${day}`,
    start: `${year}-${month}-${day}T00:00:00`,
    end: `${year}-${month}-${day}T23:59:59`
  };
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function getTwilioClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

async function getMetrics(dateStr: string, supabase: any) {
  const { start, end } = getLondonDate(dateStr === 'yesterday' ? 1 : 0);
  
  const { data, error } = await supabase
    .from('baby_metrics')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end);

  if (error) {
    console.error('Error fetching metrics:', error);
    return [];
  }

  return data || [];
}

async function getUpcomingAppointments(supabase: any) {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const oneWeekLater = new Date(londonTime);
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);

  const { data, error } = await supabase
    .from('baby_metrics')
    .select('*')
    .eq('metric_type', 'next_appointment')
    .gte('created_at', londonTime.toISOString())
    .lte('created_at', oneWeekLater.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return data || [];
}

function buildReport(todayData: any[], yesterdayData: any[], appointments: any[]) {
  // Aggregate metrics
  const today = aggregateMetrics(todayData);
  const yesterday = aggregateMetrics(yesterdayData);
  
  const todayDate = getLondonDate(0).date;
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });

  let report = `📊 BABY CARE UPDATE\n${todayDate} at ${time}\n\n`;

  // Milk breakdown
  const todayBreast = today['breastmilk'] || 0;
  const todayFormula = today['formula'] || 0;
  const todayMilk = todayBreast + todayFormula;
  
  const yesterdayBreast = yesterday['breastmilk'] || 0;
  const yesterdayFormula = yesterday['formula'] || 0;
  const yesterdayMilk = yesterdayBreast + yesterdayFormula;

  report += `🍼 MILK INTAKE:\n`;
  report += `  Today: ${todayMilk}ml\n`;
  report += `    • Breastmilk: ${todayBreast}ml\n`;
  report += `    • Formula: ${todayFormula}ml\n`;
  report += `  Yesterday: ${yesterdayMilk}ml\n`;
  const milkDiff = todayMilk - yesterdayMilk;
  report += `  ${milkDiff > 0 ? '↑' : milkDiff < 0 ? '↓' : '='} ${milkDiff > 0 ? '+' : ''}${milkDiff}ml\n\n`;

  // Other metrics
  const metrics = [
    { key: 'potty', label: '💧 POTTY', unit: '' },
    { key: 'diaper', label: '🧻 DIAPER', unit: '' },
    { key: 'bath', label: '🛁 BATH', unit: '' },
    { key: 'oil', label: '🛢️ OIL MASSAGE', unit: '' },
    { key: 'sleep', label: '😴 SLEEP', unit: 'h' },
  ];

  for (const metric of metrics) {
    const todayVal = today[metric.key] || 0;
    const yesterdayVal = yesterday[metric.key] || 0;
    const diff = todayVal - yesterdayVal;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';

    report += `${metric.label}:\n`;
    report += `  Today: ${todayVal}${metric.unit}\n`;
    report += `  Yesterday: ${yesterdayVal}${metric.unit}\n`;
    report += `  ${arrow} ${diff > 0 ? '+' : ''}${diff}\n\n`;
  }

  // Weight
  if (today['weight']) {
    report += `⚖️ WEIGHT: ${today['weight']}kg\n`;
  }

  // Fever
  if (today['fever']) {
    report += `🌡️ FEVER: ${today['fever']}°F\n`;
  }

  // Vaccine
  if (today['vaccine']) {
    report += `💉 VACCINE: Given\n`;
  }

  // Appointments
  if (today['next_appointment']) {
    report += `📅 NEXT APPOINTMENT: Scheduled\n`;
  }

  return report;
}

function aggregateMetrics(data: any[]) {
  const metrics: any = {};
  
  data.forEach(item => {
    if (!metrics[item.metric_type]) {
      metrics[item.metric_type] = 0;
    }
    if (typeof item.value === 'number') {
      metrics[item.metric_type] += item.value;
    } else {
      metrics[item.metric_type] = item.value;
    }
  });
  
  return metrics;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const client = getTwilioClient();
    
    // Get metrics for today and yesterday
    const todayData = await getMetrics('today', supabase);
    const yesterdayData = await getMetrics('yesterday', supabase);
    
    // Get upcoming appointments for next 7 days
    const appointments = await getUpcomingAppointments(supabase);

    // Build report with appointments included
    const report = buildReport(todayData, yesterdayData, appointments);

    console.log('📊 Generated report:', report);

    // Get all family phone numbers (comma-separated)
    const familyPhones = process.env.FAMILY_WHATSAPP_NUMBERS?.split(',').map(p => p.trim()) || [];
    
    const sentTo = [];

    // Send to each family member
    for (const phone of familyPhones) {
      if (phone) {
        try {
          await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${phone}`,
            body: report,
          });
          console.log(`✅ Report sent to ${phone}`);
          sentTo.push(phone);
        } catch (error) {
          console.error(`❌ Failed to send to ${phone}:`, error);
        }
      }
    }

    if (sentTo.length === 0) {
      console.log('⚠️ FAMILY_WHATSAPP_NUMBERS not set, skipping WhatsApp send');
    }

    return NextResponse.json({ 
      success: true, 
      report: report,
      sentTo: sentTo,
      totalRecipients: sentTo.length
    });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
