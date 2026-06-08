import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { CAMPUS_ID } from "../constants/campus";
import type { CampusSpace, SpaceMember } from "../types/space";

const COLLECTION_NAME = "spaces";

function requireCurrentUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in to use spaces.");
  return uid;
}

function normalizeSpaceDoc(id: string, data: Record<string, unknown>): CampusSpace {
  return {
    id,
    ...(data as Omit<CampusSpace, "id">),
  };
}

function normalizeMemberDoc(id: string, data: Record<string, unknown>): SpaceMember {
  return {
    id,
    ...(data as Omit<SpaceMember, "id">),
  };
}

export async function getSpaces(campusId = CAMPUS_ID): Promise<CampusSpace[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("campusId", "==", campusId),
      where("status", "==", "active")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((item) => normalizeSpaceDoc(item.id, item.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export function subscribeToSpaces(
  callback: (spaces: CampusSpace[]) => void,
  campusId = CAMPUS_ID
) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("campusId", "==", campusId),
    where("status", "==", "active")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeSpaceDoc(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    },
    (error) => {
      console.error("subscribeToSpaces failed", error);
      callback([]);
    }
  );
}

export async function getSpace(spaceId: string): Promise<CampusSpace | null> {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION_NAME, spaceId));
    if (!snapshot.exists()) return null;
    return normalizeSpaceDoc(snapshot.id, snapshot.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${spaceId}`);
  }
}

export async function joinSpace(space: CampusSpace): Promise<void> {
  const user = auth.currentUser;
  const uid = requireCurrentUserId();

  try {
    const token = await user?.getIdTokenResult();
    const role = token?.claims.admin === true ? "admin" : "member";

    await setDoc(
      doc(db, COLLECTION_NAME, space.id, "members", uid),
      {
        spaceId: space.id,
        userId: uid,
        campusId: space.campusId,
        role,
        status: "active",
        displayName: user?.displayName || "CampusX user",
        photoURL: user?.photoURL || "",
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastReadAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `${COLLECTION_NAME}/${space.id}/members`
    );
  }
}

export async function leaveSpace(spaceId: string): Promise<void> {
  const uid = requireCurrentUserId();

  try {
    await updateDoc(doc(db, COLLECTION_NAME, spaceId, "members", uid), {
      status: "left",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${spaceId}/members/${uid}`);
  }
}

export async function markSpaceRead(spaceId: string): Promise<void> {
  const uid = requireCurrentUserId();

  try {
    await updateDoc(doc(db, COLLECTION_NAME, spaceId, "members", uid), {
      lastReadAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${spaceId}/members/${uid}`);
  }
}

export async function getMySpaceMembership(spaceId: string): Promise<SpaceMember | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  try {
    const snapshot = await getDoc(doc(db, COLLECTION_NAME, spaceId, "members", uid));
    if (!snapshot.exists()) return null;
    return normalizeMemberDoc(snapshot.id, snapshot.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${spaceId}/members/${uid}`);
  }
}

export function subscribeToSpaceMembers(
  spaceId: string,
  callback: (members: SpaceMember[]) => void
) {
  const q = query(
    collection(db, COLLECTION_NAME, spaceId, "members"),
    where("status", "==", "active")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeMemberDoc(item.id, item.data()))
          .sort((a, b) => {
            const aTime = a.joinedAt?.toMillis?.() || 0;
            const bTime = b.joinedAt?.toMillis?.() || 0;
            return aTime - bTime;
          })
      );
    },
    (error) => {
      console.error("subscribeToSpaceMembers failed", error);
      callback([]);
    }
  );
}
