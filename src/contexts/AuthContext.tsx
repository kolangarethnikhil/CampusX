import { User, getIdTokenResult, onAuthStateChanged } from "firebase/auth";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, logout, signInWithGoogle } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  refreshClaims: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshClaims = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setIsAdmin(false);
      return;
    }

    const token = await getIdTokenResult(currentUser, true);
    setIsAdmin(token.claims.admin === true);
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        try {
          const token = await getIdTokenResult(nextUser);
          setIsAdmin(token.claims.admin === true);
        } catch (error) {
          console.error("Failed to load auth claims", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin,
      refreshClaims,
      signIn: async () => {
        await signInWithGoogle();
      },
      signOut: logout,
    }),
    [user, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}