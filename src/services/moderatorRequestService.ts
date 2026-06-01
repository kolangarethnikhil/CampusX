import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { CAMPUS_ID } from "../constants/campus";
import type { ModeratorRequest } from "../types/moderation";

const COLLECTION_NAME = "moderator_requests";

function requireCurrentUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in to request moderator access.");
  return uid;
}

function normalizeRequestDoc(id: string, data: Record<string, unknown>): ModeratorRequest {
  return {
    id,
    ...(data as Omit<ModeratorRequest, "id">),
  };
}

export async function requestModeratorRole(params: {
  spaceId: string;
  reason: string;
  campusId?: string;
}): Promise<string> {
  const uid = requireCurrentUserId();
  const reason = params.reason.trim();

  if (!params.spaceId.trim()) throw new Error("Space is required.");
  if (reason.length < 10) throw new Error("Reason is too short.");

  try {
    const ref = await addDoc(collection(db, COLLECTION_NAME), {
      campusId: params.campusId || CAMPUS_ID,
      spaceId: params.spaceId,
      requestedBy: uid,
      requestedByName: auth.currentUser?.displayName || "CampusX user",
      reason,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}

export async function getMyModeratorRequests(): Promise<ModeratorRequest[]> {
  const uid = requireCurrentUserId();

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("requestedBy", "==", uid)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((item) => normalizeRequestDoc(item.id, item.data()))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}
