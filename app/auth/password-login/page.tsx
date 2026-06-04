'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

function PasswordLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Signing you in...');
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string[]>([]);

  useEffect(() => {
    const handleLogin = async () => {
      try {
        const email = searchParams.get('email');
        const password = searchParams.get('password');
        const logs: string[] = [];

        logs.push(`Starting login for ${email}`);
        setDebug(logs);

        if (!email || !password) {
          throw new Error('Missing email or password');
        }

        setStatus('Authenticating...');
        logs.push('Attempting sign in with password');
        setDebug([...logs]);

        // Sign in with email and password
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        logs.push(`SignIn response: error=${signInError?.message || 'none'}, session=${data?.session ? 'yes' : 'no'}`);
        setDebug([...logs]);

        if (signInError) {
          throw signInError;
        }

        if (!data.session) {
          throw new Error('No session returned from sign in');
        }

        logs.push('Session created successfully');
        logs.push(`Session user: ${data.session.user?.email}`);
        setDebug([...logs]);

        // Explicitly store the session
        logs.push('Storing session in localStorage');
        const sessionData = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          expires_at: data.session.expires_at,
          token_type: 'Bearer',
          type: 'session',
          user: data.session.user,
        };
        
        // Store in localStorage with the same key Supabase uses
        if (typeof window !== 'undefined') {
          localStorage.setItem('sb-auth-token', JSON.stringify(sessionData));
          logs.push('Session stored in localStorage');
        }

        setDebug([...logs]);
        setStatus('✅ Success! Logging you in...');
        
        logs.push('Waiting 2 seconds before redirect');
        setDebug([...logs]);

        // Wait longer to ensure everything is saved
        setTimeout(() => {
          logs.push('Redirecting to dashboard');
          setDebug([...logs]);
          router.push('/dashboard');
        }, 2000);

      } catch (err: any) {
        console.error('Login error:', err);
        const errorMsg = err.message || 'Authentication failed';
        setError(errorMsg);
        setDebug(prev => [...prev, `ERROR: ${errorMsg}`]);
        setStatus('❌ Login failed');
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleLogin();
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
          Please wait...
        </p>

        {debug.length > 0 && (
          <details className="mt-6 text-left bg-gray-100 rounded p-3">
            <summary className="cursor-pointer text-xs text-gray-600 font-mono">Debug Log</summary>
            <pre className="text-xs text-gray-700 mt-2 overflow-auto max-h-40 whitespace-pre-wrap font-mono">
              {debug.join('\n')}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function PasswordLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <PasswordLoginContent />
    </Suspense>
  );
}
