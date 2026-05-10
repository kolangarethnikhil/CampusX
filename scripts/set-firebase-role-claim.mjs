import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = join(__dirname, "firebase-service-account.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

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

console.log(`✅ Set role=authenticated for ${uid}`);