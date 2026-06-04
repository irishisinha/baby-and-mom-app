/^        } else {$/i\
          // Backup: log to metrics table to verify appointment parsing\
          const appointeeNames: any = { 'shiva': 'Shiva (Mom)', 'rishi': 'Rishi (Dad)', 'ichi': 'Ichi (Grandmom)', 'jaian': 'Jaian (Baby)' };\
          await supabase.from('baby_metrics').insert({\
            family_id: PILOT_FAMILY_ID,\
            baby_id: PILOT_BABY_ID,\
            metric_type: 'next_appointment',\
            value: appointeeNames[metric.appointmentFor] || 'appointment',\
            unit: 'scheduled',\
            sent_from_phone: phoneNumber,\
            created_at: timestamp,\
            notes: metricText\
          }).catch(() => {});\
          successCount++;
