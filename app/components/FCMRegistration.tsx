'use client';

import { useEffect } from 'react';

export function FCMRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerFCM();
    }
  }, []);

  const registerFCM = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered for push');
      }
    } catch (error) {
      console.error('FCM error:', error);
    }
  };

  return null;
}
