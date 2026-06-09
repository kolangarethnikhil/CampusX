import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env variable.");
  }

  return JSON.parse(raw);
}

export function getFirebaseAdminAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(getServiceAccount()),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  return getAuth();
}

export async function verifyBearerToken(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token.");
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    throw new Error("Missing authorization token.");
  }

  return getFirebaseAdminAuth().verifyIdToken(token);
}