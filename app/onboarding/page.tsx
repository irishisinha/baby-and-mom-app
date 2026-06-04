'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // For pilot setup, auto-complete onboarding and redirect to dashboard
      // The baby (Jaian) is already hardcoded in the system
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">👶 Welcome!</h1>
        <p className="text-gray-600 mb-8">Setting up your account...</p>
        
        <div className="flex justify-center mb-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        
        <p className="text-sm text-gray-500">You're all set! Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
