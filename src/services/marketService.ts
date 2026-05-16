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

export type MarketCategory =
  | "Furniture"
  | "Electronics"
  | "Books"
  | "Essentials"
  | "Other";

export type MarketCondition = "New" | "Like New" | "Good" | "Fair";

export type MarketStatus =
  | "available"
  | "reserved"
  | "sold"
  | "closed"
  | "expired"
  | "deleted";

export type ListingDurationDays = 15 | 30;

export interface MarketListing {
  id: string;
  title: string;
  description: string;
  category: MarketCategory;
  price: number;
  condition?: MarketCondition;
  isNegotiable?: boolean;
  reasonForSelling?: string;

  latitude?: number;
  longitude?: number;
  formattedAddress?: string;

  photos: string[];
  postedBy: string;
  status: MarketStatus;

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

  createdAt: any;
  updatedAt?: any;
}

const COLLECTION_NAME = "marketplace_listings";
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

export async function getMarketListings(filters?: {
  category?: string;
}) {
  try {
    let q = query(
  collection(db, COLLECTION_NAME),
  orderBy("createdAt", "desc")
);

    if (filters?.category && filters.category !== "All") {
      q = query(q, where("category", "==", filters.category));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as MarketListing[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function getMyMarketListings(userId: string) {
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
      }) as MarketListing[];
  } catch (error) {
    console.error("getMyMarketListings failed:", error);
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function createMarketListing(
  listing: Omit<MarketListing, "id" | "createdAt" | "updatedAt">
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

export async function updateMarketListing(
  listingId: string,
  updates: Partial<Omit<MarketListing, "id" | "createdAt" | "postedBy">>
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

export async function closeMarketListing(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "closed",
  });
}

export async function reopenMarketListing(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "available",
  });
}

export async function reserveMarketListing(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "reserved",
  });
}

export async function markMarketListingSold(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "sold",
    photoCleanupDueAt: getPhotoCleanupDueTimestamp(),
  });
}

export async function expireMarketListing(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "expired",
    expiredAt: serverTimestamp() as any,
    photoCleanupDueAt: getPhotoCleanupDueTimestamp(),
  });
}

export async function renewMarketListing(
  listingId: string,
  durationDays: ListingDurationDays
): Promise<void> {
  return updateMarketListing(listingId, {
    status: "available",
    durationDays,
    expiresAt: getExpiryTimestamp(durationDays),
    renewedAt: serverTimestamp() as any,
    photoCleanupDueAt: null,
    photosRetained: true,
  });
}

export async function deleteMarketListing(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "deleted",
    deletedAt: serverTimestamp() as any,
    photoCleanupDueAt: getPhotoCleanupDueTimestamp(),
  });
}

export async function markMarketPhotosDeleted(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    photos: [],
    photosDeletedAt: serverTimestamp() as any,
    photosRetained: false,
  });
}