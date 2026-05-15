import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { serverTimestamp } from "firebase/firestore";
import { app } from "../lib/firebase.ts";
import { UserProfile } from "../contexts/AuthContext.tsx";

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
  return import.meta.env[key] as string | undefined;
}

function assertPushEnvReady() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !getEnvValue(key));

  if (missing.length > 0) {
    throw new Error(`Missing push env values: ${missing.join(", ")}`);
  }
}

function buildServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: getEnvValue("VITE_FIREBASE_API_KEY") || "",
    authDomain: getEnvValue("VITE_FIREBASE_AUTH_DOMAIN") || "",
    projectId: getEnvValue("VITE_FIREBASE_PROJECT_ID") || "",
    storageBucket: getEnvValue("VITE_FIREBASE_STORAGE_BUCKET") || "",
    messagingSenderId: getEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID") || "",
    appId: getEnvValue("VITE_FIREBASE_APP_ID") || "",
  });

  return `/firebase-messaging-sw.js?${params.toString()}`;
}

export async function isPushSupported() {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;

  return isSupported();
}

export async function requestPushPermissionAndToken(): Promise<{
  token: string;
  permission: NotificationPermission | "unsupported";
}> {
  assertPushEnvReady();

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

  const swRegistration = await navigator.serviceWorker.register(
    buildServiceWorkerUrl()
  );

  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: getEnvValue("VITE_FIREBASE_VAPID_KEY"),
    serviceWorkerRegistration: swRegistration,
  });

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