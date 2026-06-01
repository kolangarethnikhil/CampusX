import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import type { SpaceMessage } from "../types/space";

const COLLECTION_NAME = "spaces";
const DEFAULT_MESSAGE_LIMIT = 80;

function requireCurrentUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in to send messages.");
  return uid;
}

function normalizeMessageDoc(id: string, data: Record<string, unknown>): SpaceMessage {
  return {
    id,
    ...(data as Omit<SpaceMessage, "id">),
  };
}

export function subscribeToSpaceMessages(
  spaceId: string,
  callback: (messages: SpaceMessage[]) => void,
  messageLimit = DEFAULT_MESSAGE_LIMIT
) {
  const q = query(
    collection(db, COLLECTION_NAME, spaceId, "messages"),
    orderBy("createdAt", "asc"),
    limit(messageLimit)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeMessageDoc(item.id, item.data()))
          .filter((message) => message.status !== "deleted")
      );
    },
    (error) => {
      console.error("subscribeToSpaceMessages failed", error);
      callback([]);
    }
  );
}

export async function sendSpaceMessage(params: {
  spaceId: string;
  campusId: string;
  text: string;
  senderRole?: "member" | "moderator" | "admin";
}): Promise<string> {
  const uid = requireCurrentUserId();
  const text = params.text.trim();

  if (!text) throw new Error("Message cannot be empty.");
  if (text.length > 1000) throw new Error("Message is too long.");

  try {
    const ref = await addDoc(collection(db, COLLECTION_NAME, params.spaceId, "messages"), {
      spaceId: params.spaceId,
      campusId: params.campusId,
      senderId: uid,
      senderName: auth.currentUser?.displayName || "CampusX user",
      senderRole: params.senderRole || "member",
      text,
      attachments: [],
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${params.spaceId}/messages`);
  }
}

export async function markSpaceMessageDeleted(params: {
  spaceId: string;
  messageId: string;
}): Promise<void> {
  const uid = requireCurrentUserId();

  try {
    await updateDoc(doc(db, COLLECTION_NAME, params.spaceId, "messages", params.messageId), {
      status: "deleted",
      deletedBy: uid,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${COLLECTION_NAME}/${params.spaceId}/messages/${params.messageId}`
    );
  }
}
