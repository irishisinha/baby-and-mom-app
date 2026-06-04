'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Authenticating...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const handleAuth = async () => {
      try {
        // Log everything for debugging
        const logs: string[] = [];
        logs.push(`Starting auth at ${new Date().toISOString()}`);
        
        setStatus('Setting up authentication listener...');
        logs.push('Setting up auth state listener');
        
        // Listen for auth state changes (magic link will trigger SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          logs.push(`Auth event: ${event}, session: ${session ? 'exists' : 'none'}`);
          setDebugInfo(logs.join('\n'));

          if (!isMounted) return;

          if (event === 'SIGNED_IN' && session) {
            logs.push('✓ SIGNED_IN event received with session');
            setDebugInfo(logs.join('\n'));
            
            setStatus('Login successful! Redirecting to dashboard...');
            logs.push('Redirecting to dashboard');
            setDebugInfo(logs.join('\n'));
            
            // Wait a moment then redirect
            setTimeout(() => {
              if (isMounted) {
                router.push('/dashboard');
              }
            }, 1500);
          }
        });

        authSubscription = subscription;

        // Also check current session
        logs.push('Checking current session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logs.push(`Session error: ${sessionError.message}`);
        }
        
        if (session) {
          logs.push('✓ Session found immediately');
          setDebugInfo(logs.join('\n'));
          
          if (isMounted) {
            setStatus('Session found! Redirecting to dashboard...');
            setTimeout(() => {
              if (isMounted) {
                router.push('/dashboard');
              }
            }, 1000);
          }
        } else {
          logs.push('No session found yet, waiting for magic link...');
          setDebugInfo(logs.join('\n'));
          setStatus('Processing your login...');
        }

      } catch (err: any) {
        console.error('Auth error:', err);
        setError(err.message || 'Authentication failed');
        setStatus('Authentication failed');
        setDebugInfo(err.message);
        
        setTimeout(() => {
          if (isMounted) {
            router.push('/login');
          }
        }, 3000);
      }
    };

    handleAuth();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
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
        
        {debugInfo && (
          <details className="mt-6 text-left bg-gray-100 rounded p-3">
            <summary className="cursor-pointer text-xs text-gray-600 font-mono">Debug Info</summary>
            <pre className="text-xs text-gray-700 mt-2 overflow-auto max-h-32 whitespace-pre-wrap">
              {debugInfo}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
