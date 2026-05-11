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

export interface HousingListing {
  id: string;
  title: string;
  roomType: "single" | "shared" | "1BHK" | "2BHK" | "PG";
  rent: number;
  deposit: number;
  furnishing?: "Unfurnished" | "Semi-furnished" | "Fully-furnished";
  preferTenants?: "Bachelors" | "Girls Only" | "Boys Only" | "Any";
  location: string;
  distance: string;
  availableFrom: string;
  maintenance?: number;
  genderPreference: "male" | "female" | "none";
  amenities: string[];
  photos: string[];
  postedBy: string;
  status: "available" | "reserved" | "closed";
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  googleMapsUrl?: string;
  distanceFromCollegeKm?: number;
  distanceLabel?: string;
  description?: string;
  createdAt: any;
  updatedAt?: any;
}

const COLLECTION_NAME = "housing_listings";

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

export async function deleteHousingListing(listingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, listingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
}