import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { HousingListing } from "./housingService";
import { MarketListing } from "./marketService";

export type SavedPostItem =
  | {
      saveId: string;
      listingType: "housing";
      listing: HousingListing;
    }
  | {
      saveId: string;
      listingType: "market";
      listing: MarketListing;
    };

export async function getMySavedPosts(): Promise<SavedPostItem[]> {
  const user = auth.currentUser;

  if (!user) return [];

  try {
    const savedQuery = query(
      collection(db, "saved_listings"),
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(savedQuery);

    const items = await Promise.all(
      snapshot.docs.map(async (savedDoc) => {
        const data = savedDoc.data() as {
          listingId: string;
          listingType: "housing" | "market";
        };

        const collectionName =
          data.listingType === "housing"
            ? "housing_listings"
            : "marketplace_listings";

        const listingSnap = await getDoc(doc(db, collectionName, data.listingId));

        if (!listingSnap.exists()) {
  return {
    saveId: savedDoc.id,
    listingType: data.listingType,
    listing: null,
  };
}

        return {
          saveId: savedDoc.id,
          listingType: data.listingType,
          listing: {
            id: listingSnap.id,
            ...listingSnap.data(),
          },
        } as SavedPostItem;
      })
    );

    return items.filter(Boolean) as SavedPostItem[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "saved_listings");
    return [];
  }
}