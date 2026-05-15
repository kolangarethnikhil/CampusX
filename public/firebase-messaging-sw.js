/* global importScripts, firebase, self, clients */

// Use compat libraries so the service worker stays simple and compatible
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// The app registers this file with query params containing the Firebase config.
// Example: /firebase-messaging-sw.js?apiKey=...&authDomain=...&projectId=...
const params = new URL(self.location.href).searchParams;

const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

// Initialize Firebase in the service worker
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // If initialization fails, log for debugging but don't throw.
  console.error("SW: firebase.initializeApp failed", e);
}

const messaging = firebase.messaging && firebase.messaging();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle background messages from Firebase SDK
if (messaging && messaging.onBackgroundMessage) {
  messaging.onBackgroundMessage((payload) => {
    const title =
      payload?.notification?.title || payload?.data?.title || "CampusX";

    const body =
      payload?.notification?.body || payload?.data?.body ||
      "You have a new CampusX update.";

    const url = payload?.data?.url || "/";

    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `campusx-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: { url },
    });
  });
}

// Handle raw PushEvents (fallback for non-Firebase messages)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { notification: { title: "CampusX", body: event.data.text() } };
  }

  const title = payload.notification?.title || payload.data?.title || "CampusX";
  const body = payload.notification?.body || payload.data?.body || "You have a new CampusX update.";
  const url = payload.data?.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `campusx-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: { url },
    })
  );
});

// Open or focus the app when notification is clicked
self.addEventListener("notificationclick", (event) => {
  try {
    event.notification.close();
  } catch (e) {
    // ignore
  }

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});

// Basic health-check handler so we can detect that SW is running
self.addEventListener("message", (event) => {
  if (event.data === "__SW_HEALTH_CHECK__") {
    event.ports && event.ports[0] && event.ports[0].postMessage({ ok: true });
  }
});