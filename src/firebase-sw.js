/* global importScripts, firebase, self, clients */

// Load Firebase compat libraries in the service worker
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Use build-time env values injected by Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // already initialized or error
  console.error('SW: firebase.initializeApp error', e);
}

const messaging = firebase.messaging();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle messages sent via FCM when the app is in the background
if (messaging && messaging.onBackgroundMessage) {
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'CampusX';
    const body = payload.notification?.body || payload.data?.body || 'You have a new CampusX update.';
    const url = payload.data?.url || '/';

    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `campusx-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: { url },
    });
  });
}

// Fallback: handle raw push events
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { notification: { title: 'CampusX', body: event.data.text() } };
  }

  const title = payload.notification?.title || payload.data?.title || 'CampusX';
  const body = payload.notification?.body || payload.data?.body || 'You have a new CampusX update.';
  const url = payload.data?.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `campusx-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  try { event.notification.close(); } catch (e) {}
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return null;
    })
  );
});
