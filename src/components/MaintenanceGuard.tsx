import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const path = "config/global";
    const unsub = onSnapshot(doc(db, "config", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setMaintenanceMode(docSnap.data().maintenanceMode);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsub();
  }, []);

  const isAuthPage = window.location.pathname === "/auth" || window.location.pathname === "/admin-login";

  if (maintenanceMode && !isAdmin && !isAuthPage) {
    return (
      <div className="fixed inset-0 bg-emerald-900 flex items-center justify-center p-6 z-[9999]">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">System Maintenance</h1>
            <p className="text-slate-500">
              We are currently performing scheduled maintenance to improve our services. 
              Please check back later.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">
              SDA Tanzania
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
