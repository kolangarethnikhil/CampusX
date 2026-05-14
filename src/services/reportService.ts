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

export type ReportReason =
  | "fake_listing"
  | "scam"
  | "wrong_location"
  | "already_unavailable"
  | "spam"
  | "unsafe"
  | "other";

export interface ListingReport {
  id: string;
  listingId: string;
  listingType: "housing" | "market";
  listingTitle: string;
  listingOwnerId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
  status: "open" | "reviewed" | "dismissed" | "action_taken";
  createdAt: any;
}

const COLLECTION_NAME = "listing_reports";

export async function createListingReport(
  report: Omit<ListingReport, "id" | "createdAt" | "status">
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...report,
      status: "open",
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}

export async function getMyReports(userId: string) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("reporterId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as ListingReport[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}