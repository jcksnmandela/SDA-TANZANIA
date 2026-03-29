import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { MapPin, Navigation, Loader2, Compass, Shield, Info, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

interface Church {
  id: string;
  name: string;
  region: string;
  district: string;
  address: string;
  location: { lat: number; lng: number };
  distance?: number;
}

const containerStyle = {
  width: "100%",
  height: "300px",
};

export default function Nearby() {
  const { profile, isAdmin, isChurchAdmin } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(5); // Default 5KM

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY", // Placeholder
  });

  useEffect(() => {
    const fetchChurchesAndLocation = async () => {
      try {
        // Get user location
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (err) => {
              console.error("Geolocation error:", err);
              setError("Please enable location access to see nearby churches.");
            }
          );
        } else {
          setError("Geolocation is not supported by your browser.");
        }

        // Fetch churches
        const querySnapshot = await getDocs(collection(db, "churches"));
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Church[];
        setChurches(data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChurchesAndLocation();
  }, []);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const nearbyChurches = churches
    .map(church => ({
      ...church,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, church.location.lat, church.location.lng) : undefined
    }))
    .filter(church => church.distance === undefined || church.distance <= maxDistance)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Nearby Churches</h2>
          <p className="text-emerald-100 text-sm opacity-80">Find the closest SDA church to you</p>
        </div>
        <Compass size={80} className="absolute -right-4 -bottom-4 text-emerald-700/30 rotate-12" />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Search Radius</h3>
          <span className="text-emerald-700 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">{maxDistance} KM</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="100" 
          value={maxDistance} 
          onChange={(e) => setMaxDistance(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>1 KM</span>
          <span>50 KM</span>
          <span>100 KM</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm flex items-center gap-2">
          <MapPin size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-sm">Locating churches...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nearbyChurches.length > 0 ? nearbyChurches.map(church => (
            <div
              key={church.id}
              className="flex flex-col p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                  <MapPin size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 truncate">{church.name}</h3>
                  <p className="text-slate-500 text-xs truncate">{church.address}</p>
                  {church.distance !== undefined && (
                    <p className="text-emerald-700 text-xs font-bold mt-1">
                      {church.distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                  <Navigation size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/church/${church.id}`}
                  className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-emerald-600/20 active:scale-[0.97]"
                >
                  <Info size={14} />
                  View
                </Link>
                
                {(isAdmin || (isChurchAdmin && profile?.churchId === church.id)) ? (
                  <Link
                    to="/admin"
                    className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.97]"
                  >
                    <Settings size={14} />
                    Manage
                  </Link>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-100 cursor-not-allowed opacity-60">
                    <Shield size={14} />
                    Private
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-20 text-slate-400">
              <Compass size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">No churches found within {maxDistance} KM.</p>
              <p className="text-xs mt-1">Try increasing your search radius.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
