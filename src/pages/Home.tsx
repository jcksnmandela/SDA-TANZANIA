import { useState, useEffect } from "react";
import { Search, Filter, MapPin, Shield, ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn, getChurchImage } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api";

interface Church {
  id: string;
  name: string;
  region: string;
  district: string;
  address: string;
  images: string[];
}

export default function Home() {
  const { isAdmin, isChurchAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");

  const regions = [
    "All",
    "Arusha",
    "Dar es Salaam",
    "Dodoma",
    "Geita",
    "Iringa",
    "Kagera",
    "Katavi",
    "Kigoma",
    "Kilimanjaro",
    "Lindi",
    "Manyara",
    "Mara",
    "Mbeya",
    "Morogoro",
    "Mtwara",
    "Mwanza",
    "Njombe",
    "Pemba North",
    "Pemba South",
    "Pwani",
    "Rukwa",
    "Ruvuma",
    "Shinyanga",
    "Simiyu",
    "Singida",
    "Songwe",
    "Tabora",
    "Tanga",
    "Zanzibar North",
    "Zanzibar South and Central",
    "Zanzibar West"
  ];

  useEffect(() => {
    const fetchChurches = async () => {
      try {
        const data = await api.getChurches();
        setChurches(data);
      } catch (error) {
        console.error("Error fetching churches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChurches();
  }, []);

  const filteredChurches = churches.filter(church => {
    const matchesSearch = church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         church.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         church.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === "All" || church.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4">
        {(isAdmin || isChurchAdmin) && (
          <div className="bg-emerald-800 text-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-80">Admin Access</p>
                <p className="text-xs md:text-sm font-medium">Manage churches and members</p>
              </div>
            </div>
            <button 
              onClick={() => navigate("/admin")}
              className="w-full md:w-auto px-6 py-2.5 bg-white text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-md"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search churches, regions..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Filter size={16} className="text-slate-500 shrink-0" />
          {regions.map(region => {
            const count = region === "All" ? churches.length : churches.filter(c => c.region === region).length;
            return (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2",
                  selectedRegion === region
                    ? "bg-emerald-700 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
                )}
              >
                {region}
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[20px]",
                  selectedRegion === region
                    ? "bg-white text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MapPin size={20} className="text-emerald-600" />
          Churches in Tanzania
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredChurches.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredChurches.map(church => (
              <div
                key={church.id}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="aspect-video relative overflow-hidden bg-slate-100 flex items-center justify-center">
                  {church.images && church.images.length > 0 ? (
                    <img 
                      src={church.images[0]} 
                      alt={church.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center gap-1">
                      <ImageIcon size={32} strokeWidth={1} />
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-800 shadow-sm">
                    SDA CHURCH
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">
                    {church.name}
                  </h3>
                  <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                    <MapPin size={14} className="text-emerald-500" />
                    {church.district}, {church.region}
                  </p>
                  
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (profile) {
                          navigate(`/church/${church.id}`);
                        } else {
                          toast.error("Login to Access the Church");
                          navigate("/auth");
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all shadow-sm"
                    >
                      View Information
                    </button>
                    
                    {(isAdmin || (isChurchAdmin && profile?.churchId === church.id)) && (
                      <Link
                        to="/admin"
                        className="w-full py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                      >
                        <Shield size={14} />
                        Manage Data
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400">No churches found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
