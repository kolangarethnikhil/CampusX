import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import { Resend } from "resend";

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) return admin.app();

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8")
  );

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  return new Resend(apiKey);
}

function getAppUrl() {
  return process.env.CAMPUSX_APP_URL || "https://www.campus-x.app";
}

// ✅ fixed escape (important)
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    getFirebaseAdminApp();

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ ok: false, error: "No token" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    if (!decoded.email || !decoded.email_verified) {
      return res.status(403).json({
        ok: false,
        error: "Email not verified",
      });
    }

    const resend = getResendClient();
    const appUrl = getAppUrl();

    const displayName = decoded.name || "there";
    const safeName = escapeHtml(displayName);

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!, // ✅ set in Vercel
      to: [decoded.email],
      subject: "Welcome to CampusX 🎓 – Find rooms & connect",

      html: `
        <div style="font-family: Arial; background:#050505; color:#fff; padding:30px;">
          <div style="max-width:560px; margin:auto; background:#111; padding:28px; border-radius:20px; border:1px solid #222;">

            <p style="text-transform:uppercase; font-size:11px; color:#8b5cf6;">CampusX</p>

            <h1 style="font-size:26px;">Hi ${safeName} 👋</h1>

            <p style="color:#bbb; font-size:14px;">
              Welcome to CampusX — a trusted student marketplace near Kristu Jayanti University.
            </p>

            <div style="margin:20px 0; font-size:14px;">
              <p>🏠 Find rooms & PGs near campus</p>
              <p>💬 Chat directly with students</p>
              <p>🛍️ Buy/sell essentials easily</p>
            </div>

            <p style="font-size:13px; color:#9ca3af;">
              👉 Complete your profile to unlock posting and faster trust
            </p>

            <a href="${appUrl}"
              style="display:inline-block; margin-top:20px; background:#8b5cf6;
              padding:14px 20px; border-radius:12px; text-decoration:none;
              color:white; font-weight:bold; font-size:12px;">
              Open CampusX
            </a>

            <p style="margin-top:20px; font-size:12px; color:#666;">
              See you inside 🚀<br/>— Team CampusX
            </p>

          </div>
        </div>
      `,

      text: `
Hi ${displayName},

Welcome to CampusX 👋

Find rooms, chat with students and explore listings near Kristu Jayanti University.

Open app:
${appUrl}

— Team CampusX
      `,
    });

    if (error) throw error;

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}