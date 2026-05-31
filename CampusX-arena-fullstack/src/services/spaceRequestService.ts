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
import type { SpaceCategory } from "../types/space";
import type { SpaceRequest } from "../types/moderation";

const COLLECTION_NAME = "space_requests";

function requireCurrentUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in to request a space.");
  return uid;
}

function normalizeRequestDoc(id: string, data: Record<string, unknown>): SpaceRequest {
  return {
    id,
    ...(data as Omit<SpaceRequest, "id">),
  };
}

export async function requestSpace(params: {
  name: string;
  description: string;
  category: SpaceCategory;
  reason: string;
  campusId?: string;
}): Promise<string> {
  const uid = requireCurrentUserId();
  const name = params.name.trim();
  const description = params.description.trim();
  const reason = params.reason.trim();

  if (name.length < 3) throw new Error("Space name is too short.");
  if (description.length < 10) throw new Error("Description is too short.");
  if (reason.length < 10) throw new Error("Reason is too short.");

  try {
    const ref = await addDoc(collection(db, COLLECTION_NAME), {
      campusId: params.campusId || CAMPUS_ID,
      requestedBy: uid,
      requestedByName: auth.currentUser?.displayName || "CampusX user",
      name,
      description,
      category: params.category,
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

export async function getMySpaceRequests(): Promise<SpaceRequest[]> {
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
