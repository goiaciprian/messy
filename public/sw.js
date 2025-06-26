self.addEventListener('install', function () {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  self.skipWaiting();
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('Push payload:', payload);
    
    const options = {
      body: payload.body || 'New message',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      data: payload.data || {},
      tag: 'messy-message', // Group notifications
      renotify: true, // Show notification even if one with same tag exists
      requireInteraction: false, // Auto-dismiss after a while
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || 'New Messy Message', options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
    // Fallback notification
    const options = {
      body: 'You have a new message',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: {},
    };
    event.waitUntil(
      self.registration.showNotification('New Messy Message', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', function (event) {
  console.log('Notification clicked:', event.notification);
  
  event.notification.close();
  
  // Get the URL to open (from notification data or default)
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Check if there's already a window/tab open with our app
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus existing window/tab
          return client.focus();
        }
      }
      
      // If no existing window/tab, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});