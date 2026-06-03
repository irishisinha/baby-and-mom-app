'use client';

import { useEffect, useState } from 'react';
import { registerDevice } from '@/lib/firebase-client';

export function FCMRegistration() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already registered
    const token = localStorage.getItem('fcm_token');
    if (token) {
      setIsRegistered(true);
      return;
    }

    // Try to register on first load
    const register = async () => {
      try {
        const token = await registerDevice();
        if (token) {
          localStorage.setItem('fcm_token', token);
          
          // Send token to backend to store in database
          const response = await fetch('/api/fcm/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcmToken: token }),
          });

          if (response.ok) {
            setIsRegistered(true);
            console.log('✅ Device registered for notifications');
          }
        }
      } catch (err) {
        console.error('Registration failed:', err);
        setError('Failed to enable notifications');
      }
    };

    // Only register on explicit user action
    if (!token) {
      // Don't auto-register, wait for button click
    }
  }, []);

  const handleRegister = async () => {
    try {
      const token = await registerDevice();
      if (token) {
        localStorage.setItem('fcm_token', token);

        const response = await fetch('/api/fcm/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken: token }),
        });

        if (response.ok) {
          setIsRegistered(true);
          setError(null);
        }
      }
    } catch (err) {
      setError('Failed to register for notifications');
      console.error(err);
    }
  };

  if (isRegistered) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm">
        ✅ Notifications enabled - Family will be notified of updates
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3">
      <p className="text-blue-900 text-sm mb-2">
        Enable notifications to receive updates when family logs metrics
      </p>
      <button
        onClick={handleRegister}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
      >
        {error ? 'Retry' : 'Enable Notifications'}
      </button>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  );
}
