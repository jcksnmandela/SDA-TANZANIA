import { Link, useLocation } from "react-router-dom";
import { Home, MapPin, Bell, Tv, User, Shield } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";
import ChangePasswordOverlay from "./ChangePasswordOverlay";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAdmin, isChurchAdmin, mustChangePassword } = useAuth();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/nearby", icon: MapPin, label: "Nearby" },
    { path: "/announcements", icon: Bell, label: "News" },
    { path: "/live", icon: Tv, label: "Live" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  if (isAdmin || isChurchAdmin) {
    navItems.push({ path: "/admin", icon: Shield, label: "Manage" });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {mustChangePassword && <ChangePasswordOverlay />}
      <header className="bg-emerald-700 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <span className="text-xs font-bold">SDA</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">SDA Tanzania</h1>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    isActive ? "text-white" : "text-emerald-100 hover:text-white"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <footer className="bg-emerald-700 text-white py-8 pb-24 md:pb-8 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-emerald-50 text-sm font-medium">
            &copy; {new Date().getFullYear()} Jackson Mandela. All rights reserved.
          </p>
          <p className="text-emerald-200 text-xs mt-2">
            Contact: +255 689 460 993
          </p>
        </div>
      </footer>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white border-t border-slate-200 fixed bottom-0 w-full flex justify-around items-center p-2 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-colors",
                isActive ? "text-emerald-700" : "text-slate-500 hover:text-emerald-600"
              )}
            >
              <Icon size={20} className={cn(isActive && "fill-emerald-700/10")} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
