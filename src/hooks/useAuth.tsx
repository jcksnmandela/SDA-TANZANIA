import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  favorites: string[];
  role: "admin" | "church_admin" | "church_end_user" | "online_user";
  churchId?: string; // For church_admin and church_end_user
  mustChangePassword?: boolean;
  status?: "online" | "offline";
  lastSeen?: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isChurchAdmin: boolean;
  isChurchEndUser: boolean;
  isOnlineUser: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isChurchAdmin: false,
  isChurchEndUser: false,
  isOnlineUser: false,
  mustChangePassword: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        lastUid.current = user.uid;
        const docRef = doc(db, "users", user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            setProfile(profileData);
            await updateDoc(docRef, {
              status: 'online',
              lastSeen: serverTimestamp()
            });
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: user.uid,
              fullName: user.displayName || "User",
              email: user.email || "",
              favorites: [],
              role: (user.email === "jcksnmandela@gmail.com" || user.email === "admin@sda.tz") ? "admin" : "online_user",
              status: 'online',
              lastSeen: serverTimestamp()
            };
            try {
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        if (lastUid.current) {
          try {
            await updateDoc(doc(db, "users", lastUid.current), {
              status: 'offline'
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${lastUid.current}`);
          }
        }
        lastUid.current = null;
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === "admin" || (user?.email === "jcksnmandela@gmail.com" || user?.email === "admin@sda.tz"),
        isChurchAdmin: profile?.role === "church_admin",
        isChurchEndUser: profile?.role === "church_end_user",
        isOnlineUser: profile?.role === "online_user" && !(user?.email === "jcksnmandela@gmail.com" || user?.email === "admin@sda.tz"),
        mustChangePassword: !!profile?.mustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
