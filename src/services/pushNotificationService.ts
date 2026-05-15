import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { serverTimestamp } from "firebase/firestore";
import { app } from "../lib/firebase";
import { UserProfile } from "../contexts/AuthContext";

export interface ForegroundPushPayload {
  title: string;
  body: string;
  url?: string;
}

const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_VAPID_KEY",
] as const;

function getEnvValue(key: (typeof REQUIRED_ENV_KEYS)[number]) {
  const raw = import.meta.env[key] as string | undefined;

  return raw?.trim().replace(/^["']|["']$/g, "").replace(/\s/g, "");
}

function assertPushEnvReady() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !getEnvValue(key));

  if (missing.length > 0) {
    throw new Error(`Missing push env values: ${missing.join(", ")}`);
  }

  const vapidKey = getEnvValue("VITE_FIREBASE_VAPID_KEY") || "";

  if (vapidKey.length < 70 || !vapidKey.startsWith("B")) {
    throw new Error(
      "Invalid VITE_FIREBASE_VAPID_KEY. Use Firebase Console → Project settings → Cloud Messaging → Web Push certificates → public key."
    );
  }
}

const PLACEHOLDER_PATTERNS = [
  /YOUR_FIREBASE_API_KEY/i,
  /your-app-id/i,
  /your-project(?:-| )?id/i,
  /your-project\.firebaseapp\.com/i,
  /your-project\.appspot\.com/i,
];

function assertNoPlaceholderValues() {
  const bad = REQUIRED_ENV_KEYS.filter((key) => {
    const value = getEnvValue(key);
    if (!value) return false;
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
  });

  if (bad.length > 0) {
    throw new Error(
      `Push env values appear to be placeholders: ${bad.join(", ")}. Replace with your Firebase project values (Vercel env vars).`
    );
  }
}

export async function isPushSupported() {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;

  return isSupported();
}

async function registerCampusXServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Service worker registration failed: ${message}. Ensure /sw.js is reachable and not blocked by your hosting.`
    );
  }
}

export async function requestPushPermissionAndToken(): Promise<{
  token: string;
  permission: NotificationPermission | "unsupported";
}> {
  assertPushEnvReady();
  assertNoPlaceholderValues();

  const supported = await isPushSupported();

  if (!supported) {
    return {
      token: "",
      permission: "unsupported",
    };
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return {
      token: "",
      permission,
    };
  }

  const serviceWorkerRegistration = await registerCampusXServiceWorker();
  const messaging = getMessaging(app);
  const vapidKey = getEnvValue("VITE_FIREBASE_VAPID_KEY");

  let token = "";

  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    });
  } catch (error) {
    const sdkMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Messaging: A problem occurred while subscribing the user to FCM: ${sdkMessage}. Ensure your VITE_FIREBASE_* env vars (including VITE_FIREBASE_VAPID_KEY) are configured for your deployment.`
    );
  }

  const pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();

  if (!pushSubscription) {
    throw new Error(
      "FCM token generated but browser push subscription is missing. Clear site data and retry."
    );
  }

  return {
    token,
    permission,
  };
}

export async function buildPushProfileUpdate(): Promise<Partial<UserProfile>> {
  const result = await requestPushPermissionAndToken();

  return {
    notificationsEnabled: Boolean(result.token),
    fcmToken: result.token || "",
    fcmTokenUpdatedAt: result.token ? serverTimestamp() : undefined,
    pushPermission: result.permission,
  };
}

export async function listenForForegroundMessages(
  callback: (payload: ForegroundPushPayload) => void
) {
  const supported = await isPushSupported();

  if (!supported) {
    return () => {};
  }

  const messaging = getMessaging(app);

  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || payload.data?.title || "CampusX",
      body:
        payload.notification?.body ||
        payload.data?.body ||
        "You have a new CampusX update.",
      url: payload.data?.url || "/",
    });
  });
}
