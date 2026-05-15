import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import { Resend } from "resend";

type ConversationDoc = {
  participants: string[];
  listingTitle?: string;
  listingSnapshot?: {
    title?: string;
  };
};

type UserDoc = {
  displayName?: string;
  email?: string;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  fcmToken?: string;
};

type PushTokenDoc = {
  token?: string;
  tokenHash?: string;
  enabled?: boolean;
  platform?: string;
};

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

async function sendEmailFallback(params: {
  to: string;
  senderName: string;
  listingTitle: string;
  message: string;
  conversationUrl: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error("Missing RESEND_FROM_EMAIL");
  }

  const resend = getResendClient();

  const safeSenderName = escapeHtml(params.senderName);
  const safeListingTitle = escapeHtml(params.listingTitle);
  const safeMessage = escapeHtml(params.message);
  const safeUrl = escapeHtml(params.conversationUrl);

  const { data, error } = await resend.emails.send({
    from,
    to: [params.to],
    subject: `New CampusX message from ${params.senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#050505; color:#ffffff; padding:32px;">
        <div style="max-width:560px; margin:auto; background:#111111; border:1px solid #242424; border-radius:24px; padding:28px;">
          <p style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#8b5cf6; font-weight:800;">
            CampusX
          </p>

          <h1 style="margin:8px 0 12px; font-size:26px; line-height:1.2;">
            New message from ${safeSenderName}
          </h1>

          <p style="color:#bdbdbd; font-size:14px; line-height:1.6;">
            Regarding <strong style="color:#ffffff;">${safeListingTitle}</strong>
          </p>

          <div style="margin:22px 0; padding:18px; background:#191919; border-radius:18px; color:#eeeeee; font-size:15px; line-height:1.6;">
            ${safeMessage}
          </div>

          <a href="${safeUrl}" style="display:inline-block; background:#8b5cf6; color:#ffffff; text-decoration:none; padding:14px 20px; border-radius:16px; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; font-weight:800;">
            Open CampusX
          </a>

          <p style="margin-top:24px; color:#777777; font-size:12px; line-height:1.6;">
            You received this because email fallback is enabled in your CampusX notification settings.
          </p>
        </div>
      </div>
    `,
    text: `New message from ${params.senderName}\n\nRegarding: ${params.listingTitle}\n\n${params.message}\n\nOpen CampusX: ${params.conversationUrl}`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function disableStaleToken(params: {
  receiverId: string;
  tokenDocId: string;
  reason: string;
}) {
  const db = admin.firestore();

  await db
    .collection("users")
    .doc(params.receiverId)
    .collection("push_tokens")
    .doc(params.tokenDocId)
    .set(
      {
        enabled: false,
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
        disabledReason: params.reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
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

    const { conversationId, message } = req.body as {
      conversationId?: string;
      message?: string;
    };

    const trimmedMessage = message?.trim() || "";

    if (!conversationId || !trimmedMessage) {
      return res.status(400).json({
        ok: false,
        error: "conversationId and message are required",
      });
    }

    const db = admin.firestore();

    const conversationSnap = await db
      .collection("conversations")
      .doc(conversationId)
      .get();

    if (!conversationSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "Conversation not found",
      });
    }

    const conversation = conversationSnap.data() as ConversationDoc;

    if (!conversation.participants?.includes(decoded.uid)) {
      return res.status(403).json({
        ok: false,
        error: "Not a conversation participant",
      });
    }

    const receiverId = conversation.participants.find((id) => id !== decoded.uid);

    if (!receiverId) {
      return res.status(400).json({
        ok: false,
        error: "Receiver not found",
      });
    }

    const [receiverSnap, senderSnap, pushTokensSnap] = await Promise.all([
      db.collection("users").doc(receiverId).get(),
      db.collection("users").doc(decoded.uid).get(),
      db
        .collection("users")
        .doc(receiverId)
        .collection("push_tokens")
        .where("enabled", "==", true)
        .get(),
    ]);

    if (!receiverSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "Receiver profile not found",
      });
    }

    const receiver = receiverSnap.data() as UserDoc;
    const sender = senderSnap.data() as UserDoc | undefined;

    const senderName =
      sender?.displayName ||
      decoded.name ||
      decoded.email ||
      "Someone";

    const listingTitle =
      conversation.listingSnapshot?.title ||
      conversation.listingTitle ||
      "CampusX listing";

    const appUrl = getAppUrl();
    const conversationUrl = `${appUrl}/`;
    const pushTitle = `New message from ${senderName}`;
    const pushBody = `${listingTitle}: ${trimmedMessage}`;

    const pushResults: Array<{
      tokenDocId: string;
      ok: boolean;
      messageId?: string;
      errorCode?: string;
    }> = [];

    if (receiver.notificationsEnabled) {
      const tokenDocs = pushTokensSnap.docs
        .map((item) => ({
          id: item.id,
          ...(item.data() as PushTokenDoc),
        }))
        .filter((item) => Boolean(item.token));

      if (tokenDocs.length > 0) {
        await Promise.all(
          tokenDocs.map(async (tokenDoc) => {
            try {
              const messageId = await sendPushToToken({
                token: tokenDoc.token as string,
                title: pushTitle,
                body: pushBody,
                url: conversationUrl,
              });

              pushResults.push({
                tokenDocId: tokenDoc.id,
                ok: true,
                messageId,
              });
            } catch (error: any) {
              const errorCode = error?.code || "unknown";

              pushResults.push({
                tokenDocId: tokenDoc.id,
                ok: false,
                errorCode,
              });

              if (
                errorCode === "messaging/registration-token-not-registered" ||
                errorCode === "messaging/invalid-registration-token"
              ) {
                await disableStaleToken({
                  receiverId,
                  tokenDocId: tokenDoc.id,
                  reason: errorCode,
                });
              }
            }
          })
        );
      } else if (receiver.fcmToken) {
        try {
          const messageId = await sendPushToToken({
            token: receiver.fcmToken,
            title: pushTitle,
            body: pushBody,
            url: conversationUrl,
          });

          pushResults.push({
            tokenDocId: "legacy-fcmToken",
            ok: true,
            messageId,
          });
        } catch (error: any) {
          pushResults.push({
            tokenDocId: "legacy-fcmToken",
            ok: false,
            errorCode: error?.code || "unknown",
          });
        }
      }
    }

    const pushSuccessCount = pushResults.filter((item) => item.ok).length;
    let emailResult: unknown = null;
    let emailSkippedReason = "";

    if (receiver.emailNotifications && receiver.email) {
      const shouldSendEmail =
        pushSuccessCount === 0 ||
        !receiver.notificationsEnabled ||
        pushTokensSnap.empty;

      if (shouldSendEmail) {
        emailResult = await sendEmailFallback({
          to: receiver.email,
          senderName,
          listingTitle,
          message: trimmedMessage,
          conversationUrl,
        });
      } else {
        emailSkippedReason = "Push delivered to at least one device";
      }
    } else {
      emailSkippedReason = "Receiver email fallback disabled";
    }

    return res.status(200).json({
      ok: true,
      receiverId,
      pushAttempted: pushResults.length > 0,
      pushSuccessCount,
      pushResults,
      emailSent: Boolean(emailResult),
      emailSkippedReason,
    });
  } catch (error: any) {
    console.error("notify-message failed:", {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(500).json({
      ok: false,
      code: error?.code || "unknown",
      error: error?.message || "Failed to notify receiver",
    });
  }
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

async function sendPushToToken(params: {
  token: string;
  title: string;
  body: string;
  url: string;
}) {
  const message: admin.messaging.Message = {
    token: params.token,
    data: {
      title: params.title,
      body: params.body,
      url: params.url,
      sentAt: String(Date.now()),
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "86400",
      },
      notification: {
        title: params.title,
        body: params.body,
      },
      fcmOptions: {
        link: params.url,
      },
    },
  };

  return admin.messaging().send(message);
}
