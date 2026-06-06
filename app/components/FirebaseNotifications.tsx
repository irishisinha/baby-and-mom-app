'use client';

import { useEffect } from 'react';
import { useNotification } from './NotificationProvider';

declare global {
  interface Window {
    FCM_INITIALIZED?: boolean;
  }
}

export function FirebaseNotifications() {
  const { addNotification } = useNotification();

  useEffect(() => {
    if (typeof window === 'undefined' || window.FCM_INITIALIZED) return;
    
    window.FCM_INITIALIZED = true;
    setupFirebaseMessaging();

    async function setupFirebaseMessaging() {
      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);

        if (permission !== 'granted') return;

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('SW registered');

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'NOTIFICATION') {
            const { title, message } = event.data;
            addNotification(title, message, 'info');
          }
        });

        // Send registration info to backend
        await fetch('/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registered: true }),
        }).catch(e => console.error('Register error:', e));

      } catch (error) {
        console.error('FCM setup error:', error);
      }
    }
  }, [addNotification]);

  return null;
}
