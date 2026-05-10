import admin from "firebase-admin";
import serviceAccount from "./firebase-service-account.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = process.argv[2];

if (!uid) {
  console.error("Usage: node scripts/set-firebase-role-claim.mjs <firebase_uid>");
  process.exit(1);
}

await admin.auth().setCustomUserClaims(uid, {
  role: "authenticated",
});

console.log(`Set role=authenticated for ${uid}`);