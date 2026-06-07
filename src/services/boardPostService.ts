import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { CAMPUS_ID } from "../constants/campus";
import { auth, db } from "../lib/firebase";
import type { BoardPost, BoardPostType } from "../types/boardPost";
import type { UiListing } from "../types/listing";

export interface CreateBoardPostInput {
  boardId: string;
  title: string;
  description: string;
  type: BoardPostType;
  price?: number;
  location?: string;
  tags?: string[];
}

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sign in to post on CampusX.");
  }

  return user;
}

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

export function boardNameToId(boardName: string) {
  return boardName.trim().toLowerCase().replace(/\s+/g, "-");
}

export function boardIdToType(boardId: string): BoardPostType {
  if (boardId === "internships") return "internship";
  if (boardId === "part-time") return "part_time";
  if (boardId === "sports") return "event";
  if (boardId === "social") return "social";
  if (boardId === "dev-club") return "club";

  return "general";
}

export function toUiBoardPost(post: BoardPost): UiListing {
  const price =
    post.price && post.price > 0
      ? `₹${Number(post.price).toLocaleString("en-IN")}`
      : "FREE";

  return {
    id: post.id,
    sourceType: "board",
    title: post.title,
    price,
    priceUnit: "",
    location: post.location || "KJU Campus",
    distance: post.location || "ON CAMPUS",
    tag: post.type.replace("_", " ").toUpperCase(),
    tags: post.tags?.length ? post.tags : [post.status.toUpperCase()],
    author: "CampusX user",
    authorId: post.postedBy,
    timeAgo: timeAgo(post.createdAt),
    description: post.description,
    raw: post,
  };
}

export async function createBoardPost(
  input: CreateBoardPostInput
): Promise<string> {
  const user = requireUser();

  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 3) {
    throw new Error("Title is too short.");
  }

  if (title.length > 100) {
    throw new Error("Title is too long.");
  }

  if (description.length < 10) {
    throw new Error("Description is too short.");
  }

  if (description.length > 2000) {
    throw new Error("Description is too long.");
  }

  const ref = await addDoc(collection(db, "board_posts"), {
    campusId: CAMPUS_ID,
    boardId: input.boardId,
    title,
    description,
    type: input.type,
    price: input.price && input.price > 0 ? input.price : 0,
    location: input.location?.trim() || "KJU Campus",
    tags: input.tags || [],
    postedBy: user.uid,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export function subscribeToBoardPosts(
  callback: (postsByBoard: Record<string, UiListing[]>) => void
) {
  const q = query(
    collection(db, "board_posts"),
    where("campusId", "==", CAMPUS_ID),
    where("status", "==", "active")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const grouped: Record<string, UiListing[]> = {};

      snapshot.docs.forEach((item) => {
        const post = {
          id: item.id,
          ...(item.data() as Omit<BoardPost, "id">),
        } as BoardPost;

        const uiPost = toUiBoardPost(post);

        grouped[post.boardId] = grouped[post.boardId] || [];
        grouped[post.boardId].push(uiPost);
      });

      Object.keys(grouped).forEach((boardId) => {
        grouped[boardId].sort((a, b) => {
          const aTime = (a.raw as any)?.createdAt?.toMillis?.() || 0;
          const bTime = (b.raw as any)?.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      });

      callback(grouped);
    },
    (error) => {
      console.error("subscribeToBoardPosts failed", error);
      callback({});
    }
  );
}