// Pilot mode - hardcoded user for Jaian's family
export const PILOT_USER_ID = 'd5ac8a3e-3cdd-4808-a164-7e7937926e6a';
export const PILOT_FAMILY_ID = 'df3d99a8-f7a2-44cf-bcb4-9c5f3300caa6';

export async function getPilotUser() {
  return {
    id: PILOT_USER_ID,
    email: 'pilot@jaian.family',
  };
}
