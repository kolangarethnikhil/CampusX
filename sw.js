/* global importScripts, firebase, self, clients */

// This file is copied into project root so workbox injectManifest can read it during build.
// It will be transformed by the VitePWA injectManifest step.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: self?.__WB_MANIFEST && [{"revision":"062f6b8fb876dd8664040b8e4657cfdb","url":"sw.js"},{"revision":"1872c500de691dce40960bb85481de07","url":"registerSW.js"},{"revision":"2900dc8f873f79866b8641813e913b13","url":"index.html"},{"revision":"a288913b5f761dc4439396c9a6cd8858","url":"firebase-messaging-sw.js"},{"revision":null,"url":"assets/index-C0N90q6i.js"},{"revision":null,"url":"assets/index-Bf4-viCk.css"},{"revision":"fb08fa5339e45e27d43734d7597966c4","url":"og-image.png"},{"revision":"77471bd9527e6060a289985bcb84b463","url":"icons/icon-192.png"},{"revision":"a105b1b1564cce939a1e31c2c4b9e85f","url":"icons/icon-512.png"},{"revision":"020ae4a8e37cab74297230c8a76ff169","url":"manifest.webmanifest"}].VITE_FIREBASE_API_KEY || null,
};

try {
  // Initialize Firebase if possible. Workbox injectManifest will handle precache injection.
  // For safety, guard initializeApp.
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    // Note: actual runtime env config is injected by the client when registering SW via query params.
    // This file focuses on messaging handlers using compat libs.
  }
} catch (e) {
  console.error('sw.js init error', e);
}

// messaging handlers (kept minimal; main firebase config is passed via query params from client to firebase-messaging-sw.js normally)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch (e) { payload = { notification: { title: 'CampusX', body: event.data.text() } }; }
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
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return null;
    })
  );
});
