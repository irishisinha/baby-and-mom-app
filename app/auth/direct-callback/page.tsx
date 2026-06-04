'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

function DirectCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Authenticating...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const email = searchParams.get('email');
        const password = searchParams.get('password');

        if (!email || !password) {
          throw new Error('Missing email or password');
        }

        setStatus('Signing in...');

        // Sign in with email and password
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        if (!data.session) {
          throw new Error('No session returned');
        }

        setStatus('Login successful! Redirecting to dashboard...');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);

      } catch (err: any) {
        console.error('Auth error:', err);
        setError(err.message || 'Authentication failed');
        setStatus('Authentication failed');
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-gray-800">{status}</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
            <p className="text-red-700 text-sm font-medium">Error</p>
            <p className="text-red-600 text-xs mt-1">{error}</p>
          </div>
        )}
        <p className="text-gray-500 mt-8 text-sm">
          This should only take a few seconds...
        </p>
      </div>
    </div>
  );
}

export default function DirectCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <DirectCallbackContent />
    </Suspense>
  );
}
