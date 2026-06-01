import type { Timestamp } from "firebase/firestore";

export type SpaceCategory =
  | "dev"
  | "sports"
  | "study"
  | "social"
  | "music"
  | "housing"
  | "marketplace"
  | "general";

export type SpaceStatus = "active" | "archived" | "hidden";
export type SpaceRole = "member" | "moderator" | "admin";
export type SpaceMemberStatus = "active" | "muted" | "banned" | "left";
export type SpaceMessageStatus = "active" | "deleted" | "flagged";

export interface CampusSpace {
  id: string;
  campusId: string;
  name: string;
  description: string;
  category: SpaceCategory;
  icon: string;
  accent: string;
  createdBy: string;
  isOfficial: boolean;
  status: SpaceStatus;
  memberCount: number;
  activeCount?: number;
  rules?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  campusId: string;
  role: SpaceRole;
  status: SpaceMemberStatus;
  displayName?: string;
  photoURL?: string;
  joinedAt?: Timestamp;
  updatedAt?: Timestamp;
  lastReadAt?: Timestamp;
}

export interface SpaceMessage {
  id: string;
  spaceId: string;
  campusId: string;
  senderId: string;
  senderName?: string;
  senderRole?: SpaceRole;
  text: string;
  attachments?: string[];
  status: SpaceMessageStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp;
  deletedBy?: string;
}
