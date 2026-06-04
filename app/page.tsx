'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-login with default session
    const sessionData = localStorage.getItem('app-session');
    
    if (!sessionData) {
      const session = {
        email: 'parent@example.com',
        loggedInAt: new Date().toISOString(),
        token: Math.random().toString(36).substring(7)
      };
      localStorage.setItem('app-session', JSON.stringify(session));
    }

    // Redirect to dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading app...</p>
      </div>
    </div>
  );
}
