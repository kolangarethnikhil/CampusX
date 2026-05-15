import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!encoded) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8")
  );

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const internalSecret = req.headers["x-campusx-internal-secret"];

    if (internalSecret !== process.env.CAMPUSX_INTERNAL_API_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      token,
      title,
      body,
      url = "/",
    } = req.body as {
      token?: string;
      title?: string;
      body?: string;
      url?: string;
    };

    if (!token || !title || !body) {
      return res.status(400).json({
        error: "token, title, and body are required",
      });
    }

    getFirebaseAdminApp();

    const messageId = await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
        url,
      },
      webpush: {
        fcmOptions: {
          link: url,
        },
        notification: {
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
        },
      },
    });

    return res.status(200).json({
      ok: true,
      messageId,
    });
  } catch (error) {
    console.error("send-push failed:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Push send failed",
    });
  }
}