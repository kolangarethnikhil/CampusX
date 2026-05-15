import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    getFirebaseAdminApp();

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.replace("Bearer ", "");

    if (!idToken) {
      return res.status(401).json({ ok: false, error: "Missing auth token" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    const { conversationId, message } = req.body as {
      conversationId?: string;
      message?: string;
    };

    if (!conversationId || !message?.trim()) {
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
      return res.status(404).json({ ok: false, error: "Conversation not found" });
    }

    const conversation = conversationSnap.data() as {
      participants: string[];
      listingTitle?: string;
      listingSnapshot?: {
        title?: string;
      };
    };

    if (!conversation.participants.includes(decoded.uid)) {
      return res.status(403).json({ ok: false, error: "Not a participant" });
    }

    const receiverId = conversation.participants.find((id) => id !== decoded.uid);

    if (!receiverId) {
      return res.status(400).json({ ok: false, error: "Receiver not found" });
    }

    const receiverSnap = await db.collection("users").doc(receiverId).get();

    if (!receiverSnap.exists) {
      return res.status(404).json({ ok: false, error: "Receiver profile not found" });
    }

    const receiver = receiverSnap.data() as {
      notificationsEnabled?: boolean;
      fcmToken?: string;
    };

    if (!receiver.notificationsEnabled || !receiver.fcmToken) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "Receiver notifications disabled",
      });
    }

    const senderSnap = await db.collection("users").doc(decoded.uid).get();
    const sender = senderSnap.data() as { displayName?: string } | undefined;

    const senderName = sender?.displayName || "Someone";
    const listingTitle =
      conversation.listingSnapshot?.title ||
      conversation.listingTitle ||
      "CampusX listing";

    const messageId = await admin.messaging().send({
      token: receiver.fcmToken,
      data: {
        title: `New message from ${senderName}`,
        body: `${listingTitle}: ${message.trim()}`,
        url: "/",
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        fcmOptions: {
          link: "/",
        },
      },
    });

    return res.status(200).json({
      ok: true,
      messageId,
    });
  } catch (error: any) {
    console.error("notify-message failed:", {
      code: error?.code,
      message: error?.message,
    });

    return res.status(500).json({
      ok: false,
      code: error?.code || "unknown",
      error: error?.message || "Failed to notify receiver",
    });
  }
}