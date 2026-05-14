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

const COLLECTION_NAME = "user_blocks";

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt?: unknown;
}

export async function getBlockedUserIds(userId?: string): Promise<string[]> {
  const uid = userId || auth.currentUser?.uid;

  if (!uid) return [];

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("blockerId", "==", uid)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((item) => item.data() as Omit<UserBlock, "id">)
      .map((block) => block.blockedUserId)
      .filter(Boolean);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function blockUser(blockedUserId: string): Promise<string> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to block users.");
  }

  if (currentUser.uid === blockedUserId) {
    throw new Error("You cannot block yourself.");
  }

  try {
    const existingBlocks = query(
      collection(db, COLLECTION_NAME),
      where("blockerId", "==", currentUser.uid),
      where("blockedUserId", "==", blockedUserId)
    );

    const existingSnapshot = await getDocs(existingBlocks);

    if (!existingSnapshot.empty) {
      return existingSnapshot.docs[0].id;
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

export async function unblockUser(blockId: string): Promise<void> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to unblock users.");
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, blockId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
}