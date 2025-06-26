self.addEventListener('install', function () {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  self.skipWaiting();
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
    const json = event.data.json();
    const body = !!json.message ? json.message : event.data.text();
  if (body) {
    const options = {
      body: body,
      icon: '/icon1.png',
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    }
    event.waitUntil(self.registration.showNotification("New Messy Message", options))
  }
})

// Notification click handler
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(clients.openWindow('https://messym.srv-lab.work'))
})