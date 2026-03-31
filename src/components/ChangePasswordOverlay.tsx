import { useState } from "react";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { Lock, Loader2, LogOut, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function ChangePasswordOverlay() {
  const { user } = useAuth();
  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com') || user?.email?.includes('gmail.com');
  const isAdmin = user?.email === "admin@sda.tz";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isGoogleUser) {
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }

      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
    }

    setLoading(true);
    try {
      if (!isGoogleUser) {
        if (!isAdmin) {
          const credential = EmailAuthProvider.credential(user.email!, currentPassword);
          await reauthenticateWithCredential(user, credential);
        }
        await updatePassword(user, newPassword);
      }
      
      // Update local profile flag
      await api.updateUserProfile(user.uid, {
        mustChangePassword: false
      });

      toast.success(isGoogleUser ? "Profile confirmed!" : "Password updated successfully!");
      // The useAuth hook will pick up the profile change and hide this overlay
    } catch (error: any) {
      toast.error(error.message || "Failed to update password. Check your current password.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyBypass = async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    try {
      await api.updateUserProfile(user.uid, {
        mustChangePassword: false
      });
      toast.success("Security flag cleared. Welcome, Admin!");
    } catch (error: any) {
      toast.error("Failed to bypass: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/auth");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-emerald-700 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold">Security Update</h2>
          <p className="text-emerald-100 text-sm mt-2">
            For your security, you must change your default password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isGoogleUser ? (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="text-emerald-600 shrink-0" size={20} />
              <div className="space-y-2">
                <p className="text-emerald-800 text-xs font-bold">Google Account Verified</p>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  You are logged in via Google. Your account is secure and you don't need to set a separate password for this app.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="text-amber-600 shrink-0" size={20} />
              <div className="space-y-2">
                <p className="text-amber-800 text-xs font-bold">Action Required:</p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  {user?.email === "admin@sda.tz" 
                    ? "As Super Admin, you can set a new password directly below without providing the current one."
                    : "Your current password is your email address. Please copy it below and paste it into the 'Current Password' field:"}
                </p>
                <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-amber-200">
                  <code className="text-emerald-700 font-mono text-xs flex-1 truncate">{user?.email}</code>
                  <div className="flex gap-1">
                    <button 
                      type="button"
                      onClick={() => {
                        if (user?.email) {
                          navigator.clipboard.writeText(user.email);
                          toast.success("Email copied to clipboard!");
                        }
                      }}
                      className="text-[10px] bg-amber-200 text-amber-800 px-2 py-1 rounded font-bold hover:bg-amber-300 transition-colors"
                    >
                      COPY
                    </button>
                    {user?.email === "admin@sda.tz" && (
                      <>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("admin");
                            toast.success("'admin' copied!");
                          }}
                          className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold hover:bg-emerald-200 transition-colors"
                        >
                          COPY 'admin'
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("adminPassword123");
                            toast.success("Old default password copied!");
                          }}
                          className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold hover:bg-emerald-200 transition-colors"
                        >
                          TRY OLD
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-amber-800 text-[10px] leading-relaxed italic">
                  Note: If you just used a "Forgot Password" link, use the password you just created instead.
                </p>
              </div>
            </div>
          )}

          {!isGoogleUser && (
            <div className="space-y-3">
              {!isAdmin && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      placeholder="Enter current password (your email)"
                      className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Enter new password"
                    className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirm new password"
                    className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : isGoogleUser ? "Confirm & Continue" : "Update Password & Continue"}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleEmergencyBypass}
              disabled={loading}
              className="w-full py-2 text-rose-600 text-xs font-bold hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
            >
              Emergency Bypass (Admin Only)
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> Sign out and change later
          </button>
        </form>
      </div>
    </div>
  );
}
