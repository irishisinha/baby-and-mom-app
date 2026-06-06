'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((title: string, message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    const notification = { id, title, message, type };
    
    setNotifications(prev => [notification, ...prev]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationDisplay />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

function NotificationDisplay() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`m-4 p-4 rounded-lg shadow-lg pointer-events-auto animate-slide-down ${
            notif.type === 'success' ? 'bg-green-500' :
            notif.type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          } text-white`}
        >
          <p className="font-bold">{notif.title}</p>
          <p className="text-sm">{notif.message}</p>
          <button
            onClick={() => removeNotification(notif.id)}
            className="absolute top-2 right-2 text-white hover:opacity-75"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
