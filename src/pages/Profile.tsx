import { useNavigate } from "react-router-dom";
import { signOut, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { LogOut, User, Heart, Settings, ChevronRight, Shield, MapPin, Loader2, Mail, Lock, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { cn } from "../lib/utils";

interface Church {
  id: string;
  name: string;
  region: string;
  district: string;
}

export default function Profile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Church[]>([]);
  const [fetchingFavorites, setFetchingFavorites] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setEmail(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!profile?.favorites || profile.favorites.length === 0) return;
      setFetchingFavorites(true);
      try {
        const data = await Promise.all(profile.favorites.map(async (id) => {
          const snap = await getDoc(doc(db, "churches", id));
          return snap.exists() ? { id: snap.id, ...snap.data() } as Church : null;
        }));
        setFavorites(data.filter(Boolean) as Church[]);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setFetchingFavorites(false);
      }
    };

    fetchFavorites();
  }, [profile?.favorites]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setUpdating(true);
    try {
      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        fullName,
        email,
      });

      // Update Auth Profile
      await updateProfile(user, { displayName: fullName });

      // Update Auth Email if changed
      if (email !== user.email) {
        await updateEmail(user, email);
      }

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdating(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      // Update Firestore flag
      await updateDoc(doc(db, "users", user.uid), {
        mustChangePassword: false
      });

      toast.success("Password changed successfully!");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-700" /></div>;

  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
          <User size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Sign in required</h2>
          <p className="text-slate-500 text-sm">Sign in to view your profile and saved churches</p>
        </div>
        <button
          onClick={() => navigate("/auth")}
          className="w-full max-w-xs py-3 bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all"
        >
          Sign In / Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center space-y-4">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center border-4 border-white shadow-md relative">
          <User size={48} />
          {profile?.role === "admin" && (
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full shadow-sm">
              <Shield size={14} />
            </div>
          )}
        </div>
        
        {!isEditing ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800">{profile?.fullName}</h2>
            <p className="text-slate-500 text-sm">{profile?.email}</p>
            <div className="mt-2 inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
              {profile?.role}
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="w-full space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Full Name"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email Address"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updating}
                className="flex-1 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save</>}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2 w-full">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-2 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
            >
              <Settings size={16} /> Edit Profile
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {isChangingPassword ? (
        <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Lock size={18} className="text-emerald-600" />
            Change Password
          </h3>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current Password"
                required
                className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                required
                className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updating}
              className="flex-1 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              Update Password
            </button>
            <button
              type="button"
              onClick={() => setIsChangingPassword(false)}
              className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsChangingPassword(true)}
          className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
        >
          <Lock size={16} /> Change Password
        </button>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Heart size={20} className="text-red-500 fill-red-500" />
          Favorite Churches
        </h3>

        {fetchingFavorites ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
        ) : favorites.length > 0 ? (
          <div className="grid gap-3">
            {favorites.map(church => (
              <Link
                key={church.id}
                to={`/church/${church.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">{church.name}</h4>
                  <p className="text-slate-500 text-xs truncate">{church.district}, {church.region}</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm">No favorite churches yet.</p>
            <Link to="/" className="text-emerald-700 text-xs font-bold mt-2 inline-block">Explore Churches</Link>
          </div>
        )}
      </div>

      {(profile?.role === "admin" || profile?.role === "church_admin") && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-bold">
            <Shield size={18} />
            {profile.role === "admin" ? "Admin Access" : "Church Admin Access"}
          </div>
          <p className="text-amber-700 text-xs">
            You have {profile.role === "admin" ? "Super Admin" : "Church Admin"} privileges to manage the SDA Tanzania database.
          </p>
          <button
            onClick={() => navigate("/admin")}
            className="w-full py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-amber-600 transition-all"
          >
            Go to {profile.role === "admin" ? "Admin" : "Church Admin"} Panel
          </button>
        </div>
      )}
    </div>
  );
}
