import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface PushTokenRecord {
  userId: string;
  token: string;
  tokenHash: string;
  enabled: boolean;
  platform: "web";
  deviceLabel: string;
  userAgent: string;
  permission: NotificationPermission | "unsupported";
  createdAt?: unknown;
  updatedAt?: unknown;
  lastSeenAt?: unknown;
  disabledAt?: unknown;
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((item) => item.toString(16).padStart(2, "0")).join("");
}

function getDeviceLabel() {
  const ua = navigator.userAgent;

  if (/Android/i.test(ua)) return "Android browser";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS browser";
  if (/Windows/i.test(ua)) return "Windows browser";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac browser";

  return "Web browser";
}

export async function saveCurrentDevicePushToken(params: {
  token: string;
  permission: NotificationPermission | "unsupported";
}) {
  const user = auth.currentUser;

  if (!user || !params.token) return null;

  const tokenHash = await sha256(params.token);
  const tokenRef = doc(db, "users", user.uid, "push_tokens", tokenHash);

  try {
    await setDoc(
      tokenRef,
      {
        userId: user.uid,
        token: params.token,
        tokenHash,
        enabled: true,
        platform: "web",
        deviceLabel: getDeviceLabel(),
        userAgent: navigator.userAgent,
        permission: params.permission,
        updatedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return tokenHash;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, "push_tokens");
  }
}

export async function disableCurrentDevicePushToken(token?: string) {
  const user = auth.currentUser;

  if (!user || !token) return;

  const tokenHash = await sha256(token);
  const tokenRef = doc(db, "users", user.uid, "push_tokens", tokenHash);

  try {
    await setDoc(
      tokenRef,
      {
        enabled: false,
        disabledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, "push_tokens");
  }
}

export async function deleteCurrentUserPushTokens() {
  const user = auth.currentUser;

  if (!user) return;

  try {
    const q = query(
      collection(db, "users", user.uid, "push_tokens"),
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "push_tokens");
  }
}