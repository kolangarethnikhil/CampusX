import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type CampusRole = "Student" | "Alumni" | "Landlord" | "Seller";
export type VerifiedStatus = "unverified" | "pending" | "verified";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  collegeEmail?: string;
  campusRole: CampusRole;
  verifiedStatus: VerifiedStatus;
  batch?: string;
  course?: string;
  bio?: string;
  passedOutYear?: string;
  currentLocation?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isKjcEmail: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isOfficialKjcEmail = (email?: string | null) => {
  const normalized = email?.trim().toLowerCase() || "";
  return (
    normalized.endsWith("@kristujayanti.com") ||
    normalized.endsWith("@kjc.edu.in")
  );
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      try {
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          return;
        }

        const email = currentUser.email || "";
        const officialKjcEmail = isOfficialKjcEmail(email);
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const existingProfile = docSnap.data() as UserProfile;

          const shouldAutoVerify =
            officialKjcEmail && existingProfile.verifiedStatus !== "verified";

          if (shouldAutoVerify) {
            const updatedProfile: UserProfile = {
              ...existingProfile,
              email,
              collegeEmail: email,
              campusRole: "Student",
              verifiedStatus: "verified",
              updatedAt: serverTimestamp(),
            };

            await setDoc(docRef, updatedProfile, { merge: true });
            setProfile(updatedProfile);
            return;
          }

          setProfile(existingProfile);
          return;
        }

        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email,
          displayName: currentUser.displayName || "CampusX user",
          photoURL: currentUser.photoURL || "",
          collegeEmail: officialKjcEmail ? email : "",
          campusRole: officialKjcEmail ? "Student" : "Alumni",
          verifiedStatus: officialKjcEmail ? "verified" : "unverified",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      } catch (error) {
        console.error("Auth profile setup failed:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error("Google sign-in failed:", error);

    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/cancelled-popup-request" ||
      error.code === "auth/popup-closed-by-user"
    ) {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, provider);
      return;
    }

    alert(error.message || "Google sign-in failed.");
  }
};

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !profile) throw new Error("User not authenticated");

    const safeData = { ...data };

    if (!isOfficialKjcEmail(user.email)) {
      delete safeData.verifiedStatus;
    }

    const docRef = doc(db, "users", user.uid);

    await setDoc(
      docRef,
      {
        ...safeData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setProfile((prev) => (prev ? { ...prev, ...safeData } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isKjcEmail: isOfficialKjcEmail(user?.email),
        signIn,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}