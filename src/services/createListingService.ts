import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { CAMPUS_ID, KJU_ADDRESS, KJU_LOCATION } from "../constants/campus";
import { auth, db } from "../lib/firebase";

export type CreateListingType = "housing" | "market";

export type HousingRoomType =
  | "roommate"
  | "1RK"
  | "1BHK"
  | "2BHK"
  | "3BHK"
  | "PG";

export type HousingFurnishing =
  | "Unfurnished"
  | "Semi-furnished"
  | "Fully-furnished";

export type HousingTenantPreference =
  | "girls_only"
  | "boys_only"
  | "both"
  | "couples";

export type MarketCategory =
  | "Furniture"
  | "Electronics"
  | "Books"
  | "Essentials"
  | "Other";

export type MarketCondition = "New" | "Like New" | "Good" | "Fair";

interface BaseCreateInput {
  title: string;
  description: string;
  photos?: string[];
}

export interface CreateHousingInput extends BaseCreateInput {
  type: "housing";
  rent: number;
  deposit: number;
  maintenance?: number;
  roomType: HousingRoomType;
  furnishing: HousingFurnishing;
  preferTenants: HousingTenantPreference;
  availableFrom: string;
  restrictions?: string;
}

export interface CreateMarketInput extends BaseCreateInput {
  type: "market";
  price: number;
  category: MarketCategory;
  condition: MarketCondition;
  isNegotiable: boolean;
  reasonForSelling?: string;
}

export type CreateListingInput = CreateHousingInput | CreateMarketInput;

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sign in to post on CampusX.");
  }

  return user;
}

function expiryTimestamp(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return Timestamp.fromDate(date);
}

function validateBase(title: string, description: string) {
  if (title.trim().length < 3) {
    throw new Error("Title is too short.");
  }

  if (title.trim().length > 100) {
    throw new Error("Title is too long.");
  }

  if (description.trim().length < 10) {
    throw new Error("Description is too short.");
  }

  if (description.trim().length > 2000) {
    throw new Error("Description is too long.");
  }
}

export async function createListing(input: CreateListingInput): Promise<string> {
  const user = requireUser();

  const title = input.title.trim();
  const description = input.description.trim();
  const photos = input.photos || [];

  validateBase(title, description);

  if (input.type === "housing") {
    if (!Number.isFinite(input.rent) || input.rent <= 0) {
      throw new Error("Enter a valid monthly rent.");
    }

    if (!Number.isFinite(input.deposit) || input.deposit < 0) {
      throw new Error("Enter a valid deposit.");
    }

    const ref = await addDoc(collection(db, "housing_listings"), {
      campusId: CAMPUS_ID,

      title,
      description,

      roomType: input.roomType,
      rent: input.rent,
      deposit: input.deposit,
      maintenance: input.maintenance || 0,
      restrictions: input.restrictions?.trim() || "",

      preferTenants: input.preferTenants,
      furnishing: input.furnishing,
      availableFrom:
        input.availableFrom || new Date().toISOString().slice(0, 10),

      latitude: KJU_LOCATION.lat,
      longitude: KJU_LOCATION.lng,
      formattedAddress: KJU_ADDRESS,

      photos,
      postedBy: user.uid,
      status: "available",

      durationDays: 30,
      expiresAt: expiryTimestamp(30),

      photoCleanupDueAt: null,
      photosDeletedAt: null,
      photosRetained: photos.length > 0,

      viewsCount: 0,
      uniqueViewersCount: 0,
      chatStartedCount: 0,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("Enter a valid selling price.");
  }

  const ref = await addDoc(collection(db, "marketplace_listings"), {
    campusId: CAMPUS_ID,

    title,
    description,

    category: input.category,
    price: input.price,
    condition: input.condition,
    isNegotiable: input.isNegotiable,
    reasonForSelling: input.reasonForSelling?.trim() || "",

    latitude: KJU_LOCATION.lat,
    longitude: KJU_LOCATION.lng,
    formattedAddress: KJU_ADDRESS,

    photos,
    postedBy: user.uid,
    status: "available",

    durationDays: 30,
    expiresAt: expiryTimestamp(30),

    photoCleanupDueAt: null,
    photosDeletedAt: null,
    photosRetained: photos.length > 0,

    viewsCount: 0,
    uniqueViewersCount: 0,
    chatStartedCount: 0,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}