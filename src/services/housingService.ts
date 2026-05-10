import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
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
}

const COLLECTION_NAME = "housing_listings";

export async function getHousingListings(filters?: { roomType?: string; gender?: string }) {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

    if (filters?.roomType && filters.roomType !== "All") {
      q = query(q, where("roomType", "==", filters.roomType));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as HousingListing[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function createHousingListing(
  listing: Omit<HousingListing, "id" | "createdAt">
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...listing,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}