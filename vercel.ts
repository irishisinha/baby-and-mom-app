import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  crons: [
    {
      path: '/api/reports/daily',
      schedule: '0 17 * * *', // 6 PM daily (London time)
    },
  ],
};
