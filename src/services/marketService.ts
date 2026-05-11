import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface MarketListing {
  id: string;
  title: string;
  category: "Furniture" | "Electronics" | "Books" | "Essentials" | "Other";
  price: number;
  isNegotiable?: boolean;
  condition: "New" | "Like New" | "Good" | "Fair";
  reasonForSelling?: string;
  photos: string[];
  postedBy: string;
  status: "available" | "reserved" | "sold" | "closed";
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  description?: string;
  createdAt: any;
  updatedAt?: any;
}

const COLLECTION_NAME = "marketplace_listings";

export async function getMarketListings(category?: string) {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

    if (category && category !== "All") {
      q = query(q, where("category", "==", category));
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
      where("postedBy", "==", userId),
      orderBy("createdAt", "desc")
    );

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

export async function createMarketListing(
  listing: Omit<MarketListing, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...listing,
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

export async function markMarketListingSold(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "sold",
  });
}

export async function reopenMarketListing(listingId: string): Promise<void> {
  return updateMarketListing(listingId, {
    status: "available",
  });
}

export async function deleteMarketListing(listingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, listingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
}