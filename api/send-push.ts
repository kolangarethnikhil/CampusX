import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";

type PushBody = {
  token?: string;
  title?: string;
  body?: string;
  url?: string;
  dryRun?: boolean;
};

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

function normalizeUrl(url?: string) {
  if (!url?.trim()) return "/";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

function getTokenPreview(token: string) {
  if (token.length <= 18) return token;
  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const internalSecret = req.headers["x-campusx-internal-secret"];

    if (internalSecret !== process.env.CAMPUSX_INTERNAL_API_SECRET) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized",
      });
    }

    const {
      token,
      title,
      body,
      url = "/",
      dryRun = false,
    } = req.body as PushBody;

    if (!token || !title || !body) {
      return res.status(400).json({
        ok: false,
        error: "token, title, and body are required",
      });
    }

    getFirebaseAdminApp();

    const targetUrl = normalizeUrl(url);

    const message: admin.messaging.Message = {
      token,
      data: {
        title,
        body,
        url: targetUrl,
        sentAt: String(Date.now()),
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        fcmOptions: {
          link: targetUrl,
        },
      },
    };

    const messageId = await admin.messaging().send(message, dryRun);

    return res.status(200).json({
      ok: true,
      dryRun,
      messageId,
      tokenPreview: getTokenPreview(token),
    });
  } catch (error: any) {
    console.error("send-push failed:", {
      code: error?.code,
      message: error?.message,
    });

    return res.status(500).json({
      ok: false,
      code: error?.code || "unknown",
      error: error?.message || "Push send failed",
    });
  }
}