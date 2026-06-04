650,663c
        // For appointments, store in appointments table
        if (metric.type === 'next_appointment' && metric.appointmentFor) {
          // Extract date and time from metric value (e.g., "04 Jun 5pm")
          let appointmentDate = dateStr || new Date(timestamp).toISOString().split('T')[0];
          let appointmentTime = '';
          
          // Try to parse date from metric value: "04 Jun 5pm" format
          const dateMatch = metric.value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const monthNum = getMonthNumber(dateMatch[2]);
            const year = new Date().getFullYear();
            const hour = dateMatch[3];
            const minute = dateMatch[4] || '00';
            const ampm = dateMatch[5] || 'am';
            
            appointmentDate = `${year}-${monthNum}-${day}`;
            appointmentTime = `${hour}:${minute} ${ampm}`;
          }
          
          // Map appointeeFor codes to readable names
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };
          
          await supabase.from('appointments').insert({
            user_id: PILOT_FAMILY_ID,
            doctor: 'Appointment',
            reason: metricText,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            appointee_for: appointeeNames[metric.appointmentFor] || metric.appointmentFor,
            notes: `From WhatsApp: ${phoneNumber}`
          });
          successCount++;
.
