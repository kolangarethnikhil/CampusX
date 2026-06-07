import type { Timestamp } from "firebase/firestore";

export type BoardPostType =
  | "internship"
  | "part_time"
  | "event"
  | "club"
  | "social"
  | "general";

export type BoardPostStatus = "active" | "closed" | "expired" | "deleted";

export interface BoardPost {
  id: string;
  campusId: string;
  boardId: string;
  title: string;
  description: string;
  type: BoardPostType;
  price?: number;
  location?: string;
  tags: string[];
  postedBy: string;
  status: BoardPostStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}