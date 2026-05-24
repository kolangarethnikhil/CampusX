import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { trackChatStarted } from "../services/listingViewsService";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export type ListingType = "housing" | "market";
export type MessageStatus = "sent" | "delivered" | "seen";

export interface ListingSnapshot {
  id: string;
  type: ListingType;
  title: string;
  price?: number | null;
  photo?: string | null;
  location?: string | null;
  statusAtStart?: string | null;
  roomType?: string | null;
  category?: string | null;
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

  unreadBy?: Record<string, number>;

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
  listingPhoto?: string | null;
  listingPrice?: number | null;
  listingStatus?: string | null;
  listingLocation?: string | null;
  listingSnapshot?: ListingSnapshot;
}

const COLLECTION_NAME = "conversations";

function getCurrentUserId() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to use chat.");
  }

  if (!user.uid) {
    throw new Error("Your session is missing a user ID. Please sign in again.");
  }

  return user.uid;
}

function getParticipantsKey(participants: string[]) {
  return [...participants].sort().join("__");
}

function getOtherParticipant(conversation: Conversation, currentUserId: string) {
  return conversation.participants.find((id) => id !== currentUserId);
}

function nullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function notifyReceiver(conversationId: string, message: string) {
  const user = auth.currentUser;

  if (!user) return;

  try {
    const idToken = await user.getIdToken();

    await fetch("/api/notify-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        conversationId,
        message,
      }),
    });
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
  const trimmedOwnerId = ownerId.trim();
  const trimmedListingId = listingId.trim();

  if (!trimmedOwnerId) {
    throw new Error("This listing owner is unavailable. Please try another listing.");
  }

  if (!trimmedListingId) {
    throw new Error("This listing is unavailable. Please refresh and try again.");
  }

  if (trimmedOwnerId === currentUserId) {
    throw new Error("You cannot start a chat with yourself.");
  }

  const participants = [currentUserId, trimmedOwnerId];
  const participantsKey = getParticipantsKey(participants);

  try {
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where("participants", "array-contains", currentUserId),
      where("participantsKey", "==", participantsKey),
      where("listingId", "==", trimmedListingId),
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

    const listingPhoto =
      nullableString(metadata?.listingSnapshot?.photo) ??
      nullableString(metadata?.listingPhoto);
    const listingPrice =
      metadata?.listingSnapshot?.price ?? metadata?.listingPrice ?? null;
    const listingStatus =
      nullableString(metadata?.listingSnapshot?.statusAtStart) ??
      nullableString(metadata?.listingStatus) ??
      "available";
    const listingLocation =
      nullableString(metadata?.listingSnapshot?.location) ??
      nullableString(metadata?.listingLocation) ??
      "Near KJU";

    const listingSnapshot: ListingSnapshot = {
      id: trimmedListingId,
      type: normalizedListingType,
      title:
        nullableString(metadata?.listingSnapshot?.title) ??
        nullableString(listingTitle) ??
        "CampusX listing",
      price: listingPrice,
      photo: listingPhoto,
      location: listingLocation,
      statusAtStart: listingStatus,
      roomType: nullableString(metadata?.listingSnapshot?.roomType),
      category: nullableString(metadata?.listingSnapshot?.category),
      createdAt: metadata?.listingSnapshot?.createdAt ?? serverTimestamp(),
    };

    await setDoc(conversationRef, {
      participants,
      participantsKey,

      listingId: trimmedListingId,
      listingTitle: listingSnapshot.title,
      listingType: normalizedListingType,

      listingSnapshot,

      listingPhoto,
      listingPrice,
      listingStatus,
      listingLocation,

      lastMessage: "",
      lastMessageSenderId: "",
      lastMessageAt: null,

      unreadBy: {
        [currentUserId]: 0,
        [trimmedOwnerId]: 0,
      },

      lastDeliveredAtBy: {},
      lastReadAtBy: {},

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await trackChatStarted({
      listingId: trimmedListingId,
      listingType: normalizedListingType,
      listingOwnerId: trimmedOwnerId,
    });

    return conversationRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    throw error;
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
    const conversationRef = doc(db, COLLECTION_NAME, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    const conversation = conversationSnap.exists()
      ? ({ id: conversationSnap.id, ...conversationSnap.data() } as Conversation)
      : null;

    const receiverId = conversation
      ? getOtherParticipant(conversation, currentUserId)
      : null;

    await addDoc(collection(db, COLLECTION_NAME, conversationId, "messages"), {
      senderId: currentUserId,
      content: trimmed,
      status: "sent",
      readBy: {
        [currentUserId]: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
    });

    const updatePayload: Record<string, unknown> = {
      lastMessage: trimmed,
      lastMessageSenderId: currentUserId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (receiverId) {
      updatePayload[`unreadBy.${receiverId}`] = increment(1);
      updatePayload[`unreadBy.${currentUserId}`] = 0;
    }

    await updateDoc(conversationRef, updatePayload);

    void notifyReceiver(conversationId, trimmed);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "messages");
    throw error;
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
      [`unreadBy.${currentUserId}`]: 0,
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

  const otherUserId = conversation.participants.find(
    (id) => id !== currentUserId
  );

  if (!otherUserId) return "sent";

  if (conversation.lastReadAtBy?.[otherUserId]) return "seen";
  if (conversation.lastDeliveredAtBy?.[otherUserId]) return "delivered";

  return message.status || "sent";
}

export function getUnreadCount(
  conversation: Conversation,
  userId?: string | null
) {
  if (!userId) return 0;

  return Number(conversation.unreadBy?.[userId] || 0);
}
