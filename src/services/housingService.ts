import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export type HousingRoomType =
  | "roommate"
  | "1RK"
  | "1BHK"
  | "2BHK"
  | "3BHK"
  | "PG";

export type HousingTenantPreference =
  | "girls_only"
  | "boys_only"
  | "both"
  | "couples";

export type HousingFurnishing =
  | "Unfurnished"
  | "Semi-furnished"
  | "Fully-furnished";

export type HousingStatus =
  | "available"
  | "reserved"
  | "closed"
  | "expired"
  | "deleted";

export type ListingDurationDays = 15 | 30;

export interface HousingListing {
  id: string;
  title: string;
  roomType: HousingRoomType;
  rent: number;
  deposit: number;
  furnishing?: HousingFurnishing;
  preferTenants?: HousingTenantPreference;

  location: string;
  distance: string;
  availableFrom: string;
  maintenance?: number;
  restrictions?: string;

  genderPreference: "male" | "female" | "none";
  amenities: string[];
  photos: string[];
  postedBy: string;
  status: HousingStatus;

  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  googleMapsUrl?: string;

  distanceFromCollegeKm?: number;
  distanceLabel?: string;
  travelDistanceMeters?: number;
  travelDistanceLabel?: string;
  travelDurationLabel?: string;

  durationDays?: ListingDurationDays;
  expiresAt?: any;
  expiredAt?: any;
  deletedAt?: any;
  renewedAt?: any;

  photoCleanupDueAt?: any;
  photosDeletedAt?: any;
  photosRetained?: boolean;

  viewsCount?: number;
  uniqueViewersCount?: number;
  chatStartedCount?: number;
  lastViewedAt?: any;
  lastChatStartedAt?: any;

  description?: string;
  createdAt: any;
  updatedAt?: any;
}

const COLLECTION_NAME = "housing_listings";
const PHOTO_CLEANUP_GRACE_DAYS = 7;

function getFutureTimestamp(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return Timestamp.fromDate(date);
}

function getExpiryTimestamp(durationDays: ListingDurationDays) {
  return getFutureTimestamp(durationDays);
}

function getPhotoCleanupDueTimestamp() {
  return getFutureTimestamp(PHOTO_CLEANUP_GRACE_DAYS);
}

export async function getHousingListings(filters?: {
  roomType?: string;
  gender?: string;
}) {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

    if (filters?.roomType && filters.roomType !== "All") {
      q = query(q, where("roomType", "==", filters.roomType));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as HousingListing[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function getMyHousingListings(userId: string) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("postedBy", "==", userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      }) as HousingListing[];
  } catch (error) {
    console.error("getMyHousingListings failed:", error);
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function createHousingListing(
  listing: Omit<HousingListing, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const durationDays = listing.durationDays || 30;

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...listing,
      status: listing.status || "available",
      durationDays,
      expiresAt: listing.expiresAt || getExpiryTimestamp(durationDays),
      photoCleanupDueAt: null,
      photosDeletedAt: null,
      photosRetained: true,
      viewsCount: listing.viewsCount ?? 0,
      uniqueViewersCount: listing.uniqueViewersCount ?? 0,
      chatStartedCount: listing.chatStartedCount ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}

export async function updateHousingListing(
  listingId: string,
  updates: Partial<Omit<HousingListing, "id" | "createdAt" | "postedBy">>
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, listingId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, COLLECTION_NAME);
  }
}

export async function closeHousingListing(listingId: string): Promise<void> {
  return updateHousingListing(listingId, {
    status: "closed",
  });
}

export async function reopenHousingListing(listingId: string): Promise<void> {
  return updateHousingListing(listingId, {
    status: "available",
  });
}

export async function reserveHousingListing(listingId: string): Promise<void> {
  return updateHousingListing(listingId, {
    status: "reserved",
  });
}

export async function expireHousingListing(listingId: string): Promise<void> {
  return updateHousingListing(listingId, {
    status: "expired",
    expiredAt: serverTimestamp() as any,
    photoCleanupDueAt: getPhotoCleanupDueTimestamp(),
  });
}

export async function renewHousingListing(
  listingId: string,
  durationDays: ListingDurationDays
): Promise<void> {
  return updateHousingListing(listingId, {
    status: "available",
    durationDays,
    expiresAt: getExpiryTimestamp(durationDays),
    renewedAt: serverTimestamp() as any,
    photoCleanupDueAt: null,
    photosRetained: true,
  });
}

export async function deleteHousingListing(listingId: string): Promise<void> {
  return updateHousingListing(listingId, {
    status: "deleted",
    deletedAt: serverTimestamp() as any,
    photoCleanupDueAt: getPhotoCleanupDueTimestamp(),
  });
}

export async function markHousingPhotosDeleted(listingId: string): Promise<void> {
  return updateHousingListing(listingId, {
    photos: [],
    photosDeletedAt: serverTimestamp() as any,
    photosRetained: false,
  });
}

export function formatHousingRoomType(roomType?: HousingRoomType | string) {
  if (!roomType) return "Room";

  const labels: Record<string, string> = {
    roommate: "Roommate",
    "1RK": "1RK",
    "1BHK": "1BHK",
    "2BHK": "2BHK",
    "3BHK": "3BHK",
    PG: "PG",
  };

  return labels[roomType] || roomType;
}

export function formatTenantPreference(
  preference?: HousingTenantPreference | string
) {
  if (!preference) return "Both";

  const labels: Record<string, string> = {
    girls_only: "Girls only",
    boys_only: "Boys only",
    both: "Both",
    couples: "Couples allowed",
  };

  return labels[preference] || preference;
}