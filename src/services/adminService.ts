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

export interface AdminListingReport {
  id: string;
  listingId: string;
  listingType: "housing" | "market";
  listingTitle: string;
  listingOwnerId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: "open" | "reviewed" | "action_taken" | "dismissed";
  createdAt?: { toMillis?: () => number };
}

export interface AdminListingItem {
  id: string;
  listingType: "housing" | "market";
  title: string;
  price: number;
  status: string;
  postedBy: string;
  category?: string;
  roomType?: string;
  createdAt?: { toMillis?: () => number };
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

function byNewest(
  a?: { toMillis?: () => number },
  b?: { toMillis?: () => number }
) {
  return (b?.toMillis?.() || 0) - (a?.toMillis?.() || 0);
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
          .sort((a, b) => byNewest(a.createdAt, b.createdAt))
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
          .sort((a, b) => byNewest(a.createdAt, b.createdAt))
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

export function subscribeAdminReports(
  callback: (items: AdminListingReport[]) => void
) {
  const q = query(
    collection(db, "listing_reports"),
    where("status", "==", "open")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...(item.data() as Omit<AdminListingReport, "id">),
          }))
          .sort((a, b) => byNewest(a.createdAt, b.createdAt))
      );
    },
    (error) => {
      console.error("subscribeAdminReports failed", error);
      callback([]);
    }
  );
}

export function subscribeAdminListings(
  callback: (items: AdminListingItem[]) => void
) {
  const unsubscribers: Array<() => void> = [];

  let housing: AdminListingItem[] = [];
  let market: AdminListingItem[] = [];

  const emit = () =>
    callback(
      [...housing, ...market].sort((a, b) =>
        byNewest(a.createdAt, b.createdAt)
      )
    );

  unsubscribers.push(
    onSnapshot(
      collection(db, "housing_listings"),
      (snapshot) => {
        housing = snapshot.docs.map((item) => {
          const data = item.data() as any;

          return {
            id: item.id,
            listingType: "housing",
            title: data.title || "Housing listing",
            price: Number(data.rent || 0),
            status: data.status || "unknown",
            postedBy: data.postedBy || "",
            roomType: data.roomType || "",
            createdAt: data.createdAt,
          };
        });

        emit();
      },
      (error) => {
        console.error("subscribe housing admin listings failed", error);
        housing = [];
        emit();
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      collection(db, "marketplace_listings"),
      (snapshot) => {
        market = snapshot.docs.map((item) => {
          const data = item.data() as any;

          return {
            id: item.id,
            listingType: "market",
            title: data.title || "Marketplace listing",
            price: Number(data.price || 0),
            status: data.status || "unknown",
            postedBy: data.postedBy || "",
            category: data.category || "",
            createdAt: data.createdAt,
          };
        });

        emit();
      },
      (error) => {
        console.error("subscribe market admin listings failed", error);
        market = [];
        emit();
      }
    )
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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

function getListingCollectionName(listing: AdminListingItem) {
  return listing.listingType === "housing"
    ? "housing_listings"
    : "marketplace_listings";
}

export async function hideListing(listing: AdminListingItem) {
  const collectionName = getListingCollectionName(listing);

  await updateDoc(doc(db, collectionName, listing.id), {
    status: "deleted",
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function unhideListing(listing: AdminListingItem) {
  const collectionName = getListingCollectionName(listing);

  await updateDoc(doc(db, collectionName, listing.id), {
    status: "available",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function closeListing(listing: AdminListingItem) {
  const collectionName = getListingCollectionName(listing);

  await updateDoc(doc(db, collectionName, listing.id), {
    status: "closed",
    updatedAt: serverTimestamp(),
  });
}

export async function reopenListing(listing: AdminListingItem) {
  const collectionName = getListingCollectionName(listing);

  await updateDoc(doc(db, collectionName, listing.id), {
    status: "available",
    updatedAt: serverTimestamp(),
  });
}

export async function markReportReviewed(
  reportId: string,
  reviewedBy: string,
  status: "reviewed" | "dismissed" | "action_taken"
) {
  await updateDoc(doc(db, "listing_reports", reportId), {
    status,
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}