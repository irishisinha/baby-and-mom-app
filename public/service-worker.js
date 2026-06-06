self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('[SW] Push event without data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push received:', data);

    const options = {
      body: data.notification?.body || data.message || 'New notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      tag: data.notification?.title || 'notification',
      requireInteraction: false,
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(
        data.notification?.title || 'Baby & Mom Care',
        options
      )
    );
  } catch (error) {
    console.error('[SW] Error handling push:', error);
    const title = event.data.text().split('|')[0] || 'Baby & Mom Care';
    event.waitUntil(self.registration.showNotification(title));
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
