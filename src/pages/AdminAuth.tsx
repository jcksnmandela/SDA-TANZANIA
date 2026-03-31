import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "sonner";
import { ShieldCheck, Lock, User, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function AdminAuth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const adminEmail = "admin@sda.tz";
    let loginPassword = password;

    // Default shortcut: if they type 'Jackon' / 'Michael.j@96'
    if (username.toLowerCase() === "jackon" && password === "Michael.j@96") {
      loginPassword = adminEmail; // Default password is the email
    }

    try {
      try {
        await signInWithEmailAndPassword(auth, adminEmail, loginPassword);
      } catch (err: any) {
        // Fallback for old default password
        if (username.toLowerCase() === "jackon" && password === "Michael.j@96") {
          try {
            await signInWithEmailAndPassword(auth, adminEmail, "admin@sda.tz");
          } catch (innerErr: any) {
            // If still fails and user is 'Jackon', try creating the account (first time setup)
            if (innerErr.code === "auth/user-not-found" || innerErr.code === "auth/invalid-credential") {
               const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminEmail);
               await api.createUserProfile({
                 id: userCredential.user.uid,
                 fullName: "Super Admin",
                 email: adminEmail,
                 favorites: [],
                 role: "admin",
                 mustChangePassword: true,
               });
               toast.success("Admin account initialized!");
            } else {
              throw innerErr;
            }
          }
        } else {
          throw err;
        }
      }
      
      toast.success("Super Admin authenticated!");
      
      // Ensure local profile has admin role
      if (auth.currentUser) {
        await api.updateUserProfile(auth.currentUser.uid, {
          role: "admin",
          email: adminEmail,
          id: auth.currentUser.uid
        });
      }

      navigate("/admin");
    } catch (error: any) {
      toast.error("Admin Login Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <ShieldCheck className="text-emerald-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">SUPER ADMIN</h1>
          <p className="text-slate-400 font-medium">Restricted Access Area</p>
          <p className="text-[10px] text-slate-500 italic">Note: If you've changed your password, use your new one below.</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="admin"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : "AUTHENTICATE"}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link to="/auth" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Back to standard login
          </Link>
        </div>
      </div>
    </div>
  );
}
