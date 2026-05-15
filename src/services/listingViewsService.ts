import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export type ListingViewType = "housing" | "market";

function getListingCollection(type: ListingViewType) {
  return type === "housing" ? "housing_listings" : "marketplace_listings";
}

export async function trackListingView(params: {
  listingId: string;
  listingType: ListingViewType;
  listingOwnerId: string;
}) {
  const user = auth.currentUser;

  if (!user) return;
  if (user.uid === params.listingOwnerId) return;

  const viewId = `${params.listingType}_${params.listingId}_${user.uid}`;
  const viewRef = doc(db, "listing_views", viewId);
  const listingRef = doc(
    db,
    getListingCollection(params.listingType),
    params.listingId
  );

  try {
    const existing = await getDoc(viewRef);
    const isFirstView = !existing.exists();

    await setDoc(
      viewRef,
      {
        listingId: params.listingId,
        listingType: params.listingType,
        listingOwnerId: params.listingOwnerId,
        viewerId: user.uid,
        viewerEmail: user.email || "",
        lastViewedAt: serverTimestamp(),
        createdAt: existing.exists()
          ? existing.data().createdAt || serverTimestamp()
          : serverTimestamp(),
      },
      { merge: true }
    );

    await updateDoc(listingRef, {
      viewsCount: increment(1),
      lastViewedAt: serverTimestamp(),
      ...(isFirstView ? { uniqueViewersCount: increment(1) } : {}),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "listing_views");
  }
}

export async function trackChatStarted(params: {
  listingId: string;
  listingType: ListingViewType;
  listingOwnerId: string;
}) {
  const user = auth.currentUser;

  if (!user) return;
  if (user.uid === params.listingOwnerId) return;

  const listingRef = doc(
    db,
    getListingCollection(params.listingType),
    params.listingId
  );

  try {
    await updateDoc(listingRef, {
      chatStartedCount: increment(1),
      lastChatStartedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, getListingCollection(params.listingType));
  }
}