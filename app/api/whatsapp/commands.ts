import { supabaseAdmin } from '@/lib/supabase'

export async function handleCommand(text: string, phone: string, familyId: string): Promise<string | null> {
  const cmd = text.toLowerCase().trim()
  if (!cmd.match(/^(today|report|appt|feed)$/)) return null

  try {
    if (cmd === 'today') return 'Send metrics to log today activities'
    if (cmd === 'report') return await cmdReport(familyId)
    if (cmd === 'appt') return await cmdAppt(familyId)
    if (cmd === 'feed') return await cmdFeed(familyId)
    return null
  } catch (err) {
    console.error('Command error:', err)
    return 'Error processing command.'
  }
}

async function cmdReport(familyId: string): Promise<string> {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/London'
  })
  
  const [year, month, day] = formatter.format(now).split('-')
  const todayStart = new Date(`${year}-${month}-${day}T00:00:00Z`)
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const [yYear, yMonth, yDay] = formatter.format(yesterday).split('-')
  const yesterdayStart = new Date(`${yYear}-${yMonth}-${yDay}T00:00:00Z`)
  const yesterdayEnd = new Date(yesterdayStart.getTime() + 86400000)
  
  const { data: todayData } = await supabaseAdmin
    .from('baby_metrics')
    .select('metric_type, value')
    .eq('family_id', familyId)
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', todayEnd.toISOString())
  
  const { data: yesterdayData } = await supabaseAdmin
    .from('baby_metrics')
    .select('metric_type, value')
    .eq('family_id', familyId)
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', yesterdayEnd.toISOString())
  
  const todayTotals: Record<string, number> = {}
  const yesterdayTotals: Record<string, number> = {}
  
  if (todayData) {
    todayData.forEach((m: any) => {
      const val = parseFloat(m.value) || 0
      todayTotals[m.metric_type] = (todayTotals[m.metric_type] || 0) + val
    })
  }
  
  if (yesterdayData) {
    yesterdayData.forEach((m: any) => {
      const val = parseFloat(m.value) || 0
      yesterdayTotals[m.metric_type] = (yesterdayTotals[m.metric_type] || 0) + val
    })
  }
  
  let msg = `📊 Jaian (Baby) - Today vs Yesterday\n\nToday (${year}-${month}-${day}):\n`
  const types = ['formula', 'breastmilk', 'vaccine', 'potty', 'bath']
  types.forEach((t) => {
    const tv = todayTotals[t] || 0
    const yv = yesterdayTotals[t] || 0
    msg += `  ${t}: ${tv} (yesterday: ${yv})\n`
  })
  
  return msg
}

async function cmdAppt(familyId: string): Promise<string> {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })

  console.log('[APPT-CMD] familyId=', familyId, 'todayStr=', todayStr)

  try {
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .gte('appointment_date', todayStr)
      .order('appointment_date', { ascending: true })
      .limit(10)

    console.log('[APPT-QUERY] error=', error, 'count=', appointments?.length)

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
    console.error('[APPT-ERR]', err)
    return 'Error fetching appointments'
  }
}


async function cmdFeed(familyId: string): Promise<string> {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/London'
  })
  const [year, month, day] = formatter.format(now).split('-')
  const todayStart = new Date(`${year}-${month}-${day}T00:00:00Z`)
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const todayStr = `${year}-${month}-${day}`
  
  let response = `Today's Feeds - ${todayStr}

`
  
  try {
    const { data: metrics, error } = await supabaseAdmin
      .from('baby_metrics')
      .select('metric_type, value, unit, created_at')
      .eq('family_id', familyId)
      .in('metric_type', ['formula', 'breastmilk'])
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('[FEED-CMD-ERR]', error)
      return 'Error fetching feeds'
    }
    
    if (!metrics || metrics.length === 0) {
      return `No feeds logged today`
    }
    
    let totalFormula = 0
    let totalBreastmilk = 0
    let feedCount = 0
    
    metrics.forEach((m: any) => {
      feedCount++
      const time = m.metric_time || new Date(m.created_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London'
      })
      const value = parseFloat(m.value) || 0
      
      if (m.metric_type === 'formula') {
        totalFormula += value
        response += `${feedCount}. Formula: ${m.value}${m.unit} at ${time}
`
      } else if (m.metric_type === 'breastmilk') {
        totalBreastmilk += value
        response += `${feedCount}. Breastmilk: ${m.value}${m.unit} at ${time}
`
      }
    })
    
    response += `
Summary:
`
    if (totalFormula > 0) response += `  Formula: ${totalFormula}${metrics[0]?.unit || 'ml'}
`
    if (totalBreastmilk > 0) response += `  Breastmilk: ${totalBreastmilk}${metrics[0]?.unit || 'ml'}
`
    response += `  Total Feeds: ${feedCount}
`
    
    return response
  } catch (e: any) {
    console.error('[FEED-CMD-ERR]', e)
    return 'Error fetching feeds'
  }
}