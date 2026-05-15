import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

function showCampusXNotification(payload) {
  const title = payload.notification?.title || payload.data?.title || "CampusX";
  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "You have a new CampusX update.";
  const url = payload.data?.url || "/";

  return self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `campusx-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url,
    },
  });
}

onBackgroundMessage(messaging, (payload) => {
  showCampusXNotification(payload);
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      data: {
        title: "CampusX",
        body: event.data.text(),
        url: "/",
      },
    };
  }

  event.waitUntil(showCampusXNotification(payload));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
