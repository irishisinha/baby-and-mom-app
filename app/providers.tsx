'use client';

import { ReactNode } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  // Don't do any redirects here - let pages handle their own auth checks
  // Supabase client will restore session automatically from localStorage
  return <>{children}</>;
}
