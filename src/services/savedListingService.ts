import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export async function saveListing(listingId: string, listingType: "housing" | "market" | "board") {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to save listings.");
  const q = query(collection(db, "saved_listings"), where("userId", "==", user.uid), where("listingId", "==", listingId));
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(collection(db, "saved_listings"), {
    userId: user.uid,
    listingId,
    listingType: listingType === "market" ? "market" : "housing",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function unsaveListing(saveId: string) {
  await deleteDoc(doc(db, "saved_listings", saveId));
}
