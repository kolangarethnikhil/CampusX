import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface SavedListingRecord {
  saveId: string;
  listingId: string;
  listingType: "housing" | "market";
}

export async function saveListing(
  listingId: string,
  listingType: "housing" | "market" | "board"
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sign in to save listings.");
  }

  const normalizedType = listingType === "market" ? "market" : "housing";

  const q = query(
    collection(db, "saved_listings"),
    where("userId", "==", user.uid),
    where("listingId", "==", listingId)
  );

  const existing = await getDocs(q);

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const ref = await addDoc(collection(db, "saved_listings"), {
    userId: user.uid,
    listingId,
    listingType: normalizedType,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function unsaveListing(saveId: string) {
  await deleteDoc(doc(db, "saved_listings", saveId));
}

export function subscribeToSavedListings(
  userId: string,
  callback: (items: SavedListingRecord[]) => void
) {
  const q = query(
    collection(db, "saved_listings"),
    where("userId", "==", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => {
          const data = item.data();

          return {
            saveId: item.id,
            listingId: String(data.listingId || ""),
            listingType: data.listingType === "market" ? "market" : "housing",
          };
        })
      );
    },
    (error) => {
      console.error("subscribeToSavedListings failed:", error);
      callback([]);
    }
  );
}