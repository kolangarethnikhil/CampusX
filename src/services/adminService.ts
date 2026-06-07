import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { CAMPUS_ID } from "../constants/campus";
import { db } from "../lib/firebase";
import type { ModeratorRequest, SpaceRequest } from "../types/moderation";
import type { CampusSpace, SpaceCategory } from "../types/space";

export interface CreateAdminSpaceInput {
  name: string;
  description: string;
  category: SpaceCategory;
  icon: string;
  accent: string;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeSpaceRequest(
  id: string,
  data: Record<string, unknown>
): SpaceRequest {
  return {
    id,
    ...(data as Omit<SpaceRequest, "id">),
  };
}

function normalizeModeratorRequest(
  id: string,
  data: Record<string, unknown>
): ModeratorRequest {
  return {
    id,
    ...(data as Omit<ModeratorRequest, "id">),
  };
}

function normalizeSpace(id: string, data: Record<string, unknown>): CampusSpace {
  return {
    id,
    ...(data as Omit<CampusSpace, "id">),
  };
}

export function subscribeAdminSpaceRequests(
  callback: (items: SpaceRequest[]) => void
) {
  const q = query(
    collection(db, "space_requests"),
    where("status", "==", "pending")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeSpaceRequest(item.id, item.data()))
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() || 0) -
              (a.createdAt?.toMillis?.() || 0)
          )
      );
    },
    (error) => {
      console.error("subscribeAdminSpaceRequests failed", error);
      callback([]);
    }
  );
}

export function subscribeAdminModeratorRequests(
  callback: (items: ModeratorRequest[]) => void
) {
  const q = query(
    collection(db, "moderator_requests"),
    where("status", "==", "pending")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeModeratorRequest(item.id, item.data()))
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() || 0) -
              (a.createdAt?.toMillis?.() || 0)
          )
      );
    },
    (error) => {
      console.error("subscribeAdminModeratorRequests failed", error);
      callback([]);
    }
  );
}

export function subscribeAdminSpaces(callback: (items: CampusSpace[]) => void) {
  const q = query(collection(db, "spaces"), where("campusId", "==", CAMPUS_ID));

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeSpace(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    },
    (error) => {
      console.error("subscribeAdminSpaces failed", error);
      callback([]);
    }
  );
}

export async function createAdminSpace(input: CreateAdminSpaceInput) {
  const id = slugify(input.name);

  if (!id) {
    throw new Error("Enter a valid space name.");
  }

  if (input.description.trim().length < 10) {
    throw new Error("Description is too short.");
  }

  await setDoc(
    doc(db, "spaces", id),
    {
      id,
      campusId: CAMPUS_ID,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      icon: input.icon,
      accent: input.accent,
      createdBy: "admin",
      isOfficial: true,
      status: "active",
      memberCount: 0,
      activeCount: 0,
      rules: [
        "Be respectful",
        "No spam",
        "Keep it useful",
        "Moderator can remove unsafe posts",
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
}

export async function approveSpaceRequest(
  request: SpaceRequest,
  reviewedBy: string
) {
  const spaceId = slugify(request.name);

  if (!spaceId) {
    throw new Error("Invalid requested space name.");
  }

  await setDoc(
    doc(db, "spaces", spaceId),
    {
      id: spaceId,
      campusId: request.campusId || CAMPUS_ID,
      name: request.name.trim(),
      description: request.description.trim(),
      category: request.category,
      icon: "networking",
      accent: "#8b5cf6",
      createdBy: request.requestedBy,
      isOfficial: false,
      status: "active",
      memberCount: 0,
      activeCount: 0,
      rules: [
        "Be respectful",
        "No spam",
        "Keep it useful",
        "Moderator can remove unsafe posts",
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await updateDoc(doc(db, "space_requests", request.id), {
    status: "approved",
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return spaceId;
}

export async function rejectSpaceRequest(
  requestId: string,
  reviewedBy: string
) {
  await updateDoc(doc(db, "space_requests", requestId), {
    status: "rejected",
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function approveModeratorRequest(
  request: ModeratorRequest,
  reviewedBy: string
) {
  await setDoc(
    doc(db, "spaces", request.spaceId, "members", request.requestedBy),
    {
      spaceId: request.spaceId,
      userId: request.requestedBy,
      campusId: request.campusId || CAMPUS_ID,
      role: "moderator",
      status: "active",
      displayName: request.requestedByName || "CampusX moderator",
      photoURL: "",
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastReadAt: serverTimestamp(),
    },
    { merge: true }
  );

  await updateDoc(doc(db, "moderator_requests", request.id), {
    status: "approved",
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectModeratorRequest(
  requestId: string,
  reviewedBy: string
) {
  await updateDoc(doc(db, "moderator_requests", requestId), {
    status: "rejected",
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSpaceStatus(
  spaceId: string,
  status: "active" | "archived" | "hidden"
) {
  await updateDoc(doc(db, "spaces", spaceId), {
    status,
    updatedAt: serverTimestamp(),
  });
}