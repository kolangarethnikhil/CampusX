import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { HousingListingDoc, MarketListingDoc, UiListing } from "../types/listing";

function timeAgo(createdAt: any) {
  const ms = createdAt?.toMillis?.();
  if (!ms) return "recently";

  const diff = Date.now() - ms;
  const mins = Math.max(1, Math.floor(diff / 60000));

  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

function firstAddressPart(address?: string) {
  return address?.split(",")[0]?.trim() || "Near KJU";
}

export function toUiHousingListing(item: HousingListingDoc): UiListing {
  return {
    id: item.id,
    sourceType: "housing",
    title: item.title || "CampusX room",
    price: item.rent ? `₹${Number(item.rent).toLocaleString("en-IN")}` : "₹0",
    priceUnit: "/ MONTH",
    location: firstAddressPart(item.formattedAddress || item.location),
    distance: item.travelDistanceLabel || item.distanceLabel || "NEAR KJU",
    tag: item.roomType || "ROOM",
    tags: [
      item.furnishing || "UNFURNISHED",
      item.preferTenants || item.status || "AVAILABLE",
    ]
      .filter(Boolean)
      .map(String),
    author: "CampusX user",
    authorId: item.postedBy,
    timeAgo: timeAgo(item.createdAt),
    description: item.description || "Student-posted room near campus.",
    raw: item,
  };
}

export function toUiMarketListing(item: MarketListingDoc): UiListing {
  return {
    id: item.id,
    sourceType: "market",
    title: item.title || "CampusX item",
    price: item.price ? `₹${Number(item.price).toLocaleString("en-IN")}` : "₹0",
    priceUnit: "",
    location: firstAddressPart(item.formattedAddress),
    distance: "NEAR KJU",
    tag: item.category || "ITEM",
    tags: [item.condition || "GOOD", item.status || "AVAILABLE"]
      .filter(Boolean)
      .map(String),
    author: "CampusX user",
    authorId: item.postedBy,
    timeAgo: timeAgo(item.createdAt),
    description: item.description || "Student marketplace item.",
    raw: item,
  };
}

export function subscribeToHousingListings(callback: (items: UiListing[]) => void) {
  const q = query(
    collection(db, "housing_listings"),
    where("status", "in", ["available", "reserved"])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((doc) =>
            toUiHousingListing({
              id: doc.id,
              ...(doc.data() as any),
            })
          )
          .sort((a, b) => {
            const aTime = (a.raw as any)?.createdAt?.toMillis?.() || 0;
            const bTime = (b.raw as any)?.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
      );
    },
    (error) => {
      console.error("subscribeToHousingListings failed", error);
      callback([]);
    }
  );
}

export function subscribeToMarketListings(callback: (items: UiListing[]) => void) {
  const q = query(
    collection(db, "marketplace_listings"),
    where("status", "in", ["available", "reserved"])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((doc) =>
            toUiMarketListing({
              id: doc.id,
              ...(doc.data() as any),
            })
          )
          .sort((a, b) => {
            const aTime = (a.raw as any)?.createdAt?.toMillis?.() || 0;
            const bTime = (b.raw as any)?.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
      );
    },
    (error) => {
      console.error("subscribeToMarketListings failed", error);
      callback([]);
    }
  );
}