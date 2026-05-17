import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import { Resend } from "resend";

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) return admin.app();

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

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

function getAppUrl() {
  return process.env.CAMPUSX_APP_URL || "https://www.campus-x.app";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    getFirebaseAdminApp();

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.replace("Bearer ", "");

    if (!idToken) {
      return res.status(401).json({
        ok: false,
        error: "Missing auth token",
      });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email?.trim() || "";

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "User email is required",
      });
    }

    const from = process.env.RESEND_FROM_EMAIL;

    if (!from) {
      throw new Error("Missing RESEND_FROM_EMAIL");
    }

    const resend = getResendClient();
    const appUrl = getAppUrl();
    const displayName = decoded.name?.trim() || "CampusX user";
    const safeName = escapeHtml(displayName);
    const safeAppUrl = escapeHtml(appUrl);

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: "Welcome to CampusX",
      html: `
        <div style="font-family: Arial, sans-serif; background:#050505; color:#ffffff; padding:32px;">
          <div style="max-width:560px; margin:auto; background:#111111; border:1px solid #242424; border-radius:24px; padding:28px;">
            <p style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#8b5cf6; font-weight:800;">
              CampusX
            </p>

            <h1 style="margin:8px 0 12px; font-size:26px; line-height:1.2;">
              Welcome, ${safeName}
            </h1>

            <p style="color:#bdbdbd; font-size:14px; line-height:1.6;">
              Your account is ready. Complete your profile, browse listings, and start connecting with the KJU community.
            </p>

            <a href="${safeAppUrl}" style="display:inline-block; background:#8b5cf6; color:#ffffff; text-decoration:none; padding:14px 20px; border-radius:16px; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; font-weight:800; margin-top:18px;">
              Open CampusX
            </a>
          </div>
        </div>
      `,
      text: `Welcome to CampusX, ${displayName}\n\nYour account is ready. Complete your profile, browse listings, and start connecting with the KJU community.\n\nOpen CampusX: ${appUrl}`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({
      ok: true,
      email,
      messageId: data?.id || null,
    });
  } catch (error: any) {
    console.error("send-welcome-email failed:", {
      code: error?.code,
      message: error?.message,
    });

    return res.status(500).json({
      ok: false,
      code: error?.code || "unknown",
      error: error?.message || "Welcome email failed",
    });
  }
}
