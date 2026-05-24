import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export type ListingViewType = "housing" | "market";
export type OwnerListingStats = Record<
  string,
  {
    viewsCount: number;
    chatStartedCount: number;
  }
>;

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

  try {
    const existing = await getDoc(viewRef);

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

  const viewId = `${params.listingType}_${params.listingId}_${user.uid}`;
  const viewRef = doc(db, "listing_views", viewId);

  try {
    const existing = await getDoc(viewRef);
    const existingData = existing.exists() ? existing.data() : null;

    await setDoc(
      viewRef,
      {
        listingId: params.listingId,
        listingType: params.listingType,
        listingOwnerId: params.listingOwnerId,
        viewerId: user.uid,
        viewerEmail: user.email || "",
        chatStartedAt: existingData?.chatStartedAt || serverTimestamp(),
        lastChatStartedAt: serverTimestamp(),
        createdAt: existingData?.createdAt || serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "listing_views");
  }
}

export function subscribeToOwnerListingStats(
  ownerId: string,
  callback: (stats: OwnerListingStats) => void
) {
  if (!ownerId) {
    callback({});
    return () => {};
  }

  const q = query(
    collection(db, "listing_views"),
    where("listingOwnerId", "==", ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const stats = snapshot.docs.reduce<OwnerListingStats>((acc, item) => {
        const data = item.data();
        const listingId = typeof data.listingId === "string" ? data.listingId : "";

        if (!listingId) return acc;

        const current = acc[listingId] || {
          viewsCount: 0,
          chatStartedCount: 0,
        };

        acc[listingId] = {
          viewsCount: current.viewsCount + (data.lastViewedAt ? 1 : 0),
          chatStartedCount:
            current.chatStartedCount + (data.chatStartedAt ? 1 : 0),
        };

        return acc;
      }, {});

      callback(stats);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, "listing_views");
      callback({});
    }
  );
}
