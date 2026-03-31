import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { api } from "../api";

interface UserProfile {
  id: string;
  name: string;
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
        try {
          const profileData = await api.getUserProfile(user.uid);
          if (profileData) {
            setProfile(profileData);
            await api.updateUserProfile(user.uid, {
              status: 'online',
              lastSeen: new Date().toISOString()
            });
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || "User",
              email: user.email || "",
              favorites: [],
              role: (user.email === "jcksnmandela@gmail.com" || user.email === "admin@sda.tz") ? "admin" : "online_user",
              status: 'online',
              lastSeen: new Date().toISOString()
            };
            await api.createUserProfile(newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching/creating profile:", error);
        }
      } else {
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
