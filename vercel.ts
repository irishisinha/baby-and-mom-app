import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  crons: [
    {
      path: '/api/reports/daily',
      schedule: '0 16 * * *', // 4 PM daily (London time) - includes daily report + upcoming appointments
    },
    // Appointment reminders moved into daily report at 4 PM
    // {
    //   path: '/api/appointments/reminders',
    //   schedule: '0 9 * * *', // 9 AM daily (London time) - DEPRECATED: now included in 4 PM report
    // },
  ],
};
