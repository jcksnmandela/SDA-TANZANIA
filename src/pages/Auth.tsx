import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "sonner";
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [publicSignups, setPublicSignups] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const config = await api.getEntities("config");
        const globalConfig = config.find((c: any) => c.id === "global");
        if (globalConfig) {
          setPublicSignups(globalConfig.publicSignups);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !publicSignups) {
      toast.error("Public signups are currently disabled.");
      return;
    }
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (isLogin) {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        toast.success("Welcome back!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const user = userCredential.user;
        const userData = {
          id: user.uid,
          fullName,
          email: trimmedEmail,
          favorites: [],
          role: (trimmedEmail === "jcksnmandela@gmail.com" || trimmedEmail === "admin@sda.tz") ? "admin" : "online_user",
        };
        try {
          await api.createUserProfile(userData);
        } catch (error) {
          console.error("Error creating profile:", error);
        }
        toast.success("Account created successfully!");
      }
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Signed in with Google!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6 flex flex-col justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-emerald-800">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-slate-500">
          {isLogin
            ? "Sign in to access your favorite SDA churches"
            : "Join the SDA Tanzania community today"}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && !publicSignups && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle size={20} />
            <p>Public signups are currently disabled by the administrator.</p>
          </div>
        )}
        {!isLogin && publicSignups && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Email Address"
            required
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {isLogin && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!isLogin && !publicSignups)}
          className="w-full py-3 bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isLogin ? (
            <>
              <LogIn size={18} /> Sign In
            </>
          ) : (
            <>
              <UserPlus size={18} /> Sign Up
            </>
          )}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-2 text-slate-500">Or continue with</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        Google Sign In
      </button>

      <p className="text-center text-sm text-slate-600">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-emerald-700 font-bold hover:underline"
        >
          {isLogin ? "Sign Up" : "Sign In"}
        </button>
      </p>

      <div className="pt-4 border-t border-slate-100">
        <Link 
          to="/admin-login" 
          className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all text-sm"
        >
          <ShieldCheck size={16} /> Super Admin Login
        </Link>
      </div>
    </div>
  );
}
