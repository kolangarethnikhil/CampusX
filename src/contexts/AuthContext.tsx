import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type CampusRole =
  | "Student"
  | "Alumni"
  | "Campus Community"
  | "Landlord"
  | "Seller";

export type VerifiedStatus = "unverified" | "pending" | "verified";
export type GenderOption = "male" | "female" | "prefer_not_to_say";

export type DiscoverySource =
  | "instagram"
  | "friends"
  | "whatsapp"
  | "college"
  | "other";

export type CommunityIntent =
  | "explore"
  | "utility"
  | "business"
  | "other";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  collegeEmail?: string;
  campusRole: CampusRole;
  verifiedStatus: VerifiedStatus;

  gender?: GenderOption;
  batch?: string;
  course?: string;
  bio?: string;
  passedOutYear?: string;
  currentLocation?: string;
  hometown?: string;
  discoverySource?: DiscoverySource;
  communityIntent?: CommunityIntent;
  profileCompleted?: boolean;

  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  marketingOptIn?: boolean;
  fcmToken?: string;
  fcmTokenUpdatedAt?: unknown;
  pushPermission?: NotificationPermission | "unsupported";
  pushSubscription?: unknown;

  createdAt?: unknown;
  updatedAt?: unknown;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isKjcEmail: boolean;
  profileCompleted: boolean;
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

function removeUndefined<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function isProfileComplete(profile: UserProfile | null) {
  if (!profile) return false;

  if (!profile.displayName?.trim()) return false;
  if (!profile.campusRole) return false;
  if (!profile.gender) return false;
  if (!profile.currentLocation?.trim()) return false;
  if (!profile.discoverySource) return false;

  if (profile.campusRole === "Student" || profile.campusRole === "Alumni") {
    if (!profile.course?.trim()) return false;
    if (!profile.batch?.trim()) return false;
  }

  if (profile.campusRole === "Campus Community" && !profile.communityIntent) {
    return false;
  }

  return Boolean(profile.profileCompleted);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      try {
        setUser(currentUser);

        if (!currentUser) {
  setProfile(null);
  setLoading(false); 
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
          campusRole: officialKjcEmail ? "Student" : "Campus Community",
          verifiedStatus: officialKjcEmail ? "verified" : "unverified",
          profileCompleted: false,
          notificationsEnabled: false,
          emailNotifications: false,
          marketingOptIn: false,
          pushPermission:
            typeof Notification === "undefined" ? "unsupported" : Notification.permission,
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

    const safeData = removeUndefined({ ...data }) as Partial<UserProfile>;

    safeData.uid = profile.uid;
    safeData.email = profile.email;

    if (!isOfficialKjcEmail(user.email)) {
      delete safeData.verifiedStatus;
      delete safeData.collegeEmail;
    }

    const nextProfile = {
      ...profile,
      ...safeData,
    };

    const profileCompleted = isProfileComplete({
      ...nextProfile,
      profileCompleted: true,
    });

    const docRef = doc(db, "users", user.uid);

    await setDoc(
      docRef,
      {
        ...safeData,
        profileCompleted,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...safeData,
            profileCompleted,
          }
        : prev
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isKjcEmail: isOfficialKjcEmail(user?.email),
        profileCompleted: isProfileComplete(profile),
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
