import { supabaseAdmin } from '@/lib/supabase'

export async function handleCommand(text: string, phone: string, familyId: string): Promise<string | null> {
  const cmd = text.toLowerCase().trim()
  if (!cmd.match(/^(today|report|appt)$/)) return null

  try {
    if (cmd === 'today') return 'Send metrics to log today activities'
    if (cmd === 'report') return await cmdReport(familyId)
    if (cmd === 'appt') return await cmdAppt(familyId)
    return null
  } catch (err) {
    console.error('Command error:', err)
    return 'Error processing command.'
  }
}

async function cmdReport(familyId: string): Promise<string> {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
  
  let r = `Daily Report - ${todayStr}\n\n`
  
  const { data: events } = await supabaseAdmin
    .from('baby_events').select('type, value')
    .eq('family_id', familyId)
    .gte('created_at', new Date(today).toISOString())
    .lt('created_at', new Date(Date.now() + 86400000).toISOString())
  
  if (!events?.length) {
    return `No entries logged yet on ${todayStr}`
  }
  
  const counts: Record<string, any> = {}
  events.forEach(e => {
    if (!counts[e.type]) counts[e.type] = { count: 0, values: [] }
    counts[e.type].count++
    if (e.value) counts[e.type].values.push(e.value)
  })
  
  r += `Baby - Jaian\n`
  Object.entries(counts).forEach(([type, data]: [string, any]) => {
    if (data.values.length > 0) {
      r += `  • ${type}: ${data.values.join(', ')}\n`
    } else {
      r += `  • ${type}: ${data.count}\n`
    }
  })
  
  return r
}

async function cmdAppt(familyId: string): Promise<string> {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
  
  try {
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .gte('appointment_date', todayStr)
      .order('appointment_date', { ascending: true })
      .limit(10)
    
    if (!appointments?.length) {
      return 'No upcoming appointments scheduled'
    }
    
    let r = 'Upcoming Appointments:\n\n'
    appointments.forEach((apt: any, idx: number) => {
      const dateStr = new Date(apt.appointment_date).toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
      r += `${idx + 1}. ${apt.doctor}\n   ${dateStr} at ${apt.appointment_time || ''}\n   ${apt.reason || ''}\n\n`
    })
    
    return r
  } catch (err) {
    return 'Error fetching appointments'
  }
}
