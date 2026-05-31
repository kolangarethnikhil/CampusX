import type { Timestamp } from "firebase/firestore";
import type { SpaceCategory } from "./space";

export type RequestStatus = "pending" | "approved" | "rejected";

export interface SpaceRequest {
  id: string;
  campusId: string;
  requestedBy: string;
  requestedByName?: string;
  name: string;
  description: string;
  category: SpaceCategory;
  reason: string;
  status: RequestStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ModeratorRequest {
  id: string;
  campusId: string;
  spaceId: string;
  requestedBy: string;
  requestedByName?: string;
  reason: string;
  status: RequestStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
