import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { CAMPUS_ID, KJU_ADDRESS, KJU_LOCATION } from "../constants/campus";
import { auth, db } from "../lib/firebase";

export type CreateListingType = "housing" | "market";

export interface CreateListingInput {
  type: CreateListingType;
  title: string;
  description: string;
  price: number;
  category?: string;
  roomType?: string;
  condition?: string;
}

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

export async function createListing(
  input: CreateListingInput
): Promise<string> {
  const user = requireUser();

  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 3) {
    throw new Error("Title is too short.");
  }

  if (description.length < 10) {
    throw new Error("Description is too short.");
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("Enter a valid price.");
  }

  if (input.type === "housing") {
    const ref = await addDoc(collection(db, "housing_listings"), {
      campusId: CAMPUS_ID,

      title,
      description,

      roomType: input.roomType || "roommate",
      rent: input.price,
      deposit: 0,
      maintenance: 0,
      restrictions: "",

      preferTenants: "both",
      furnishing: "Unfurnished",
      availableFrom: new Date().toISOString().slice(0, 10),

      latitude: KJU_LOCATION.lat,
      longitude: KJU_LOCATION.lng,
      formattedAddress: KJU_ADDRESS,

      photos: [],
      postedBy: user.uid,
      status: "available",

      durationDays: 30,
      expiresAt: expiryTimestamp(30),

      photoCleanupDueAt: null,
      photosDeletedAt: null,
      photosRetained: true,

      viewsCount: 0,
      uniqueViewersCount: 0,
      chatStartedCount: 0,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  }

  const ref = await addDoc(collection(db, "marketplace_listings"), {
    campusId: CAMPUS_ID,

    title,
    description,

    category: input.category || "Essentials",
    price: input.price,
    condition: input.condition || "Good",
    isNegotiable: true,
    reasonForSelling: "",

    latitude: KJU_LOCATION.lat,
    longitude: KJU_LOCATION.lng,
    formattedAddress: KJU_ADDRESS,

    photos: [],
    postedBy: user.uid,
    status: "available",

    durationDays: 30,
    expiresAt: expiryTimestamp(30),

    photoCleanupDueAt: null,
    photosDeletedAt: null,
    photosRetained: true,

    viewsCount: 0,
    uniqueViewersCount: 0,
    chatStartedCount: 0,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}