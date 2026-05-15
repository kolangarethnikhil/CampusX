import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Conversation } from "./chatService";

type PushTargetProfile = {
  displayName?: string;
  notificationsEnabled?: boolean;
  fcmToken?: string;
};

function getNotificationApiUrl() {
  return "/api/send-push";
}

export async function notifyMessageReceiver(params: {
  conversation: Conversation;
  message: string;
}) {
  const currentUser = auth.currentUser;

  if (!currentUser) return;

  const receiverId = params.conversation.participants.find(
    (participantId) => participantId !== currentUser.uid
  );

  if (!receiverId) return;

  const receiverSnap = await getDoc(doc(db, "users", receiverId));

  if (!receiverSnap.exists()) return;

  const receiver = receiverSnap.data() as PushTargetProfile;

  if (!receiver.notificationsEnabled || !receiver.fcmToken) return;

  const senderName = currentUser.displayName || "Someone";
  const listingTitle =
    params.conversation.listingSnapshot?.title ||
    params.conversation.listingTitle ||
    "your listing";

  try {
    await fetch(getNotificationApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-campusx-internal-secret": import.meta.env
          .VITE_CAMPUSX_PUBLIC_NOTIFY_BRIDGE_SECRET,
      },
      body: JSON.stringify({
        token: receiver.fcmToken,
        title: `New message from ${senderName}`,
        body: `${listingTitle}: ${params.message}`,
        url: "/",
      }),
    });
  } catch (error) {
    console.error("notifyMessageReceiver failed:", error);
  }
}