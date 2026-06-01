import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  crons: [
    {
      path: '/api/reports/daily',
      schedule: '0 3,11,18,21 * * *', // 4 AM, 12 noon, 7 PM, 10 PM London time (UTC during summer)
    },
  ],
};
