'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          router.push('/login?error=auth_failed');
          return;
        }

        if (session) {
          // Check if setup is complete
          const { data: profile } = await supabase
            .from('profiles')
            .select('setup_completed')
            .eq('id', session.user.id)
            .single();

          if (!profile?.setup_completed) {
            router.push('/onboarding');
          } else {
            router.push('/dashboard');
          }
        } else {
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
