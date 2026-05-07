import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  collegeEmail?: string;
  campusRole: 'Student' | 'Alumni' | 'Landlord' | 'Seller';
  verifiedStatus: 'unverified' | 'pending' | 'verified';
  batch?: string;
  course?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // New user initial profile
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'KJC Student',
            photoURL: user.photoURL || '',
            campusRole: 'Student',
            verifiedStatus: 'unverified',
          };
          await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Sign in error:', error);
      alert(`Sign in failed: ${error.message}\nIf you deployed this, ensure the domain is added to Firebase Auth Authorized Domains.`);
    }
  };

  const logout = () => signOut(auth);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, data, { merge: true });
    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
