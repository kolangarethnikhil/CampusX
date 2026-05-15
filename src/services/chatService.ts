import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export type ListingType = "housing" | "market";
export type MessageStatus = "sent" | "delivered" | "seen";

export interface ListingSnapshot {
  id: string;
  type: ListingType;
  title: string;
  price?: number;
  photo?: string;
  location?: string;
  statusAtStart?: string;
  roomType?: string;
  category?: string;
  createdAt?: unknown;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantsKey?: string;

  listingId: string;
  listingTitle: string;
  listingType: ListingType | string;

  listingSnapshot?: ListingSnapshot;

  listingPhoto?: string;
  listingPrice?: number;
  listingStatus?: string;
  listingLocation?: string;

  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: unknown;

  lastDeliveredAtBy?: Record<string, unknown>;
  lastReadAtBy?: Record<string, unknown>;

  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  content: string;
  status?: MessageStatus;
  deliveredAt?: unknown;
  seenAt?: unknown;
  readBy?: Record<string, unknown>;
  createdAt?: unknown;
}

export interface ListingMetadata {
  listingPhoto?: string;
  listingPrice?: number;
  listingStatus?: string;
  listingLocation?: string;
  listingSnapshot?: ListingSnapshot;
}

const COLLECTION_NAME = "conversations";

function getCurrentUserId() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to use chat.");
  }

  return user.uid;
}

function getParticipantsKey(participants: string[]) {
  return [...participants].sort().join("__");
}

async function notifyReceiver(conversationId: string, message: string) {
  const user = auth.currentUser;

  if (!user) return;

  try {
    const token = await user.getIdToken();

    const response = await fetch("/api/notify-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId,
        message,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("notifyReceiver failed:", text);
    }
  } catch (error) {
    console.error("notifyReceiver failed:", error);
  }
}

export async function startConversation(
  ownerId: string,
  listingId: string,
  listingTitle: string,
  listingType: string,
  metadata?: ListingMetadata
): Promise<string> {
  const currentUserId = getCurrentUserId();

  if (ownerId === currentUserId) {
    throw new Error("You cannot start a chat with yourself.");
  }

  const participants = [currentUserId, ownerId];
  const participantsKey = getParticipantsKey(participants);

  try {
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where("participantsKey", "==", participantsKey),
      where("listingId", "==", listingId),
      limit(1)
    );

    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0];

      await updateDoc(existingDoc.ref, {
        updatedAt: serverTimestamp(),
      });

      return existingDoc.id;
    }

    const conversationRef = doc(collection(db, COLLECTION_NAME));

    const normalizedListingType: ListingType =
      listingType === "housing" ? "housing" : "market";

    const listingSnapshot: ListingSnapshot = {
      id: listingId,
      type: normalizedListingType,
      title: listingTitle,
      ...(typeof metadata?.listingPrice === "number"
        ? { price: metadata.listingPrice }
        : {}),
      ...(metadata?.listingPhoto ? { photo: metadata.listingPhoto } : {}),
      ...(metadata?.listingLocation ? { location: metadata.listingLocation } : {}),
      ...(metadata?.listingStatus ? { statusAtStart: metadata.listingStatus } : {}),
    };

    await setDoc(conversationRef, {
      participants,
      participantsKey,

      listingId,
      listingTitle,
      listingType: normalizedListingType,

      listingSnapshot,

      listingPhoto: metadata?.listingPhoto || "",
      listingPrice: metadata?.listingPrice || 0,
      listingStatus: metadata?.listingStatus || "",
      listingLocation: metadata?.listingLocation || "",

      lastMessage: "",
      lastMessageSenderId: "",
      lastMessageAt: null,

      lastDeliveredAtBy: {},
      lastReadAtBy: {},

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return conversationRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}

export function subscribeToConversations(
  callback: (conversations: Conversation[]) => void
) {
  const currentUserId = auth.currentUser?.uid;

  if (!currentUserId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION_NAME),
    where("participants", "array-contains", currentUserId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Conversation[]
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      callback([]);
    }
  );
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME, conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          conversationId,
          ...item.data(),
        })) as Message[]
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, "messages");
      callback([]);
    }
  );
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<void> {
  const currentUserId = getCurrentUserId();
  const trimmed = content.trim();

  if (!trimmed) return;

  try {
    await addDoc(collection(db, COLLECTION_NAME, conversationId, "messages"), {
      senderId: currentUserId,
      content: trimmed,
      status: "sent",
      readBy: {
        [currentUserId]: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, COLLECTION_NAME, conversationId), {
      lastMessage: trimmed,
      lastMessageSenderId: currentUserId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    void notifyReceiver(conversationId, trimmed);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "messages");
  }
}

export async function markConversationDelivered(conversationId: string) {
  const currentUserId = auth.currentUser?.uid;

  if (!currentUserId) return;

  try {
    await updateDoc(doc(db, COLLECTION_NAME, conversationId), {
      [`lastDeliveredAtBy.${currentUserId}`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("markConversationDelivered failed:", error);
  }
}

export async function markConversationSeen(conversationId: string) {
  const currentUserId = auth.currentUser?.uid;

  if (!currentUserId) return;

  try {
    await updateDoc(doc(db, COLLECTION_NAME, conversationId), {
      [`lastDeliveredAtBy.${currentUserId}`]: serverTimestamp(),
      [`lastReadAtBy.${currentUserId}`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("markConversationSeen failed:", error);
  }
}

export function getConversationListingSnapshot(conversation: Conversation) {
  return {
    title: conversation.listingSnapshot?.title || conversation.listingTitle,
    photo: conversation.listingSnapshot?.photo || conversation.listingPhoto || "",
    price: conversation.listingSnapshot?.price || conversation.listingPrice || 0,
    location:
      conversation.listingSnapshot?.location ||
      conversation.listingLocation ||
      "",
    status:
      conversation.listingStatus ||
      conversation.listingSnapshot?.statusAtStart ||
      "",
    type: conversation.listingSnapshot?.type || conversation.listingType,
  };
}

export function getMessageVisualStatus(
  message: Message,
  conversation: Conversation,
  currentUserId?: string | null
): MessageStatus {
  if (!currentUserId) return "sent";
  if (message.senderId !== currentUserId) return "seen";

  const otherUserId = conversation.participants.find((id) => id !== currentUserId);

  if (!otherUserId) return "sent";

  if (conversation.lastReadAtBy?.[otherUserId]) return "seen";
  if (conversation.lastDeliveredAtBy?.[otherUserId]) return "delivered";

  return message.status || "sent";
}