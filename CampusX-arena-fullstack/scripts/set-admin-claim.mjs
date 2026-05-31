import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  return applicationDefault();
}

if (!getApps().length) {
  initializeApp({
    credential: getCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const [uid, value = "true"] = process.argv.slice(2);

if (!uid) {
  console.error("Usage: npm run admin:set -- <firebase_uid> [true|false]");
  process.exit(1);
}

const admin = value !== "false";
const auth = getAuth();

const user = await auth.getUser(uid);
const currentClaims = user.customClaims || {};

await auth.setCustomUserClaims(uid, {
  ...currentClaims,
  admin,
});

console.log(`Set admin=${admin} for ${uid}`);
console.log("Ask the user to sign out/sign in again to refresh ID token claims.");
