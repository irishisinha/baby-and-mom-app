'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically handles the token from URL
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          router.push('/login?error=auth_failed');
          return;
        }

        if (session) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard');
        } else {
          // No session, go back to login
          router.push('/login');
        }
      } catch (err) {
        console.error('Callback error:', err);
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <p className="text-lg text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
