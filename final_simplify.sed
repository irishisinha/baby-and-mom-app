/For appointments, store in appointments table/,/} else {/{
  s/if (metric.type === 'next_appointment' && metric.appointmentFor) {/if (metric.type === 'next_appointment') { metric.unit = 'appointment'; /
  /await supabase.from('appointments')/,/});/d
}
