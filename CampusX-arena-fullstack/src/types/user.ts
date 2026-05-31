import type { Timestamp } from "firebase/firestore";

export type CampusUserRole = "student" | "alumni" | "outsider" | "admin";
export type VerifiedStatus = "verified" | "pending" | "unverified";

export interface CampusUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: CampusUserRole;
  campusId: string;
  verifiedStatus: VerifiedStatus;
  course?: string;
  batch?: string;
  bio?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastActiveAt?: Timestamp;
}
