import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: any;
}

const COLLECTION_NAME = "user_blocks";

export async function blockUser(blockedUserId: string): Promise<string> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to block users.");
  }

  if (currentUser.uid === blockedUserId) {
    throw new Error("You cannot block yourself.");
  }

  try {
    const existing = await getBlockDoc(currentUser.uid, blockedUserId);

    if (existing) {
      return existing.id;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      blockerId: currentUser.uid,
      blockedUserId,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}

export async function unblockUser(blockedUserId: string): Promise<void> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to unblock users.");
  }

  try {
    const existing = await getBlockDoc(currentUser.uid, blockedUserId);

    if (!existing) return;

    await deleteDoc(doc(db, COLLECTION_NAME, existing.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("blockerId", "==", userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((item) => item.data().blockedUserId)
      .filter(Boolean) as string[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function isUserBlocked(blockedUserId: string): Promise<boolean> {
  const currentUser = auth.currentUser;

  if (!currentUser) return false;

  const existing = await getBlockDoc(currentUser.uid, blockedUserId);

  return Boolean(existing);
}

async function getBlockDoc(blockerId: string, blockedUserId: string) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("blockerId", "==", blockerId),
    where("blockedUserId", "==", blockedUserId)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const first = snapshot.docs[0];

  return {
    id: first.id,
    ...first.data(),
  } as UserBlock;
}