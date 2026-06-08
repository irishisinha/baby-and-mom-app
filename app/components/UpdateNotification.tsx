'use client';

import { useEffect, useState } from 'react';

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check for updates every 30 seconds
      const interval = setInterval(async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistrations();
          if (registration.length > 0) {
            for (let reg of registration) {
              await reg.update();
              if (reg.waiting) {
                setUpdateAvailable(true);
              }
            }
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      }, 30000);

      // Check immediately on load
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0 && registrations[0].waiting) {
          setUpdateAvailable(true);
        }
      });

      return () => clearInterval(interval);
    }
  }, []);

  const handleUpdate = () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      });
      
      // Force reload after a short delay to ensure new SW takes control
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex justify-between items-center gap-4">
      <span className="text-sm font-medium">New version available!</span>
      <button
        onClick={handleUpdate}
        className="bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-gray-100 text-sm whitespace-nowrap"
      >
        Reload
      </button>
    </div>
  );
}
