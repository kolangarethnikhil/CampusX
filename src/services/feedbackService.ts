import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

const ISSUE_COLLECTION = "app_issues";
const FEEDBACK_COLLECTION = "app_feedback";

export type AppIssueType =
  | "login"
  | "posting"
  | "chat"
  | "map_location"
  | "profile"
  | "safety"
  | "other";

export async function submitAppIssue(data: {
  type: AppIssueType;
  message: string;
  page?: string;
}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to report an issue.");
  }

  try {
    await addDoc(collection(db, ISSUE_COLLECTION), {
      reporterId: user.uid,
      reporterEmail: user.email || "",
      type: data.type,
      message: data.message.trim(),
      page: data.page || window.location.pathname,
      userAgent: navigator.userAgent,
      status: "open",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, ISSUE_COLLECTION);
  }
}

export async function submitAppFeedback(data: {
  rating: number;
  message?: string;
}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to send feedback.");
  }

  try {
    await addDoc(collection(db, FEEDBACK_COLLECTION), {
      userId: user.uid,
      email: user.email || "",
      rating: data.rating,
      message: data.message?.trim() || "",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, FEEDBACK_COLLECTION);
  }
}
