import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { MapPin, Phone, Clock, Users, Bell, Tv, ArrowLeft, Navigation, Heart, Share2, Loader2, Shield, FileText, FileSpreadsheet, Database, Eye } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { cn, formatDate } from "../lib/utils";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Church {
  id: string;
  name: string;
  region: string;
  district: string;
  address: string;
  location: { lat: number; lng: number };
  contact: string;
  images: string[];
}

interface Service {
  id: string;
  name: string;
  schedule: string;
  description: string;
}

interface Minister {
  id: string;
  name: string;
  role: string;
}

export default function ChurchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [church, setChurch] = useState<Church | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [ministers, setMinisters] = useState<Minister[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [livestreams, setLivestreams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"services" | "ministers" | "announcements" | "members" | "users" | "livestreams">("services");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const handleSearch = () => {
    let data: any[] = [];
    switch (activeTab) {
      case "services": data = services; break;
      case "ministers": data = ministers; break;
      case "announcements": data = announcements; break;
      case "members": data = members; break;
      case "users": data = users; break;
      case "livestreams": data = livestreams; break;
    }

    const filtered = data.filter(item => {
      const itemDate = new Date(item.createdAt || item.date || "").toISOString().split('T')[0];
      let matchesDate = true;
      if (dateRange.start && itemDate < dateRange.start) matchesDate = false;
      if (dateRange.end && itemDate > dateRange.end) matchesDate = false;
      return matchesDate;
    });
    setFilteredData(filtered);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const data = filteredData.length > 0 ? filteredData : [];
    if (data.length === 0) { toast.error("No data to export"); return; }
    
    autoTable(doc, {
      head: [Object.keys(data[0])],
      body: data.map(item => Object.values(item)),
    });
    doc.save(`${activeTab}_report.pdf`);
  };

  const exportToExcel = () => {
    const data = filteredData.length > 0 ? filteredData : [];
    if (data.length === 0) { toast.error("No data to export"); return; }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `${activeTab}_report.xlsx`);
  };

  const canViewMembers = profile?.role === "admin" || 
                        (profile?.role === "church_admin" && profile?.churchId === id) || 
                        (profile?.role === "church_end_user" && profile?.churchId === id);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        const churchSnap = await getDoc(doc(db, "churches", id));
        if (churchSnap.exists()) {
          setChurch({ id: churchSnap.id, ...churchSnap.data() } as Church);
        }

        const servicesSnap = await getDocs(query(collection(db, "services"), where("churchId", "==", id)));
        setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));

        const ministersSnap = await getDocs(query(collection(db, "ministers"), where("churchId", "==", id)));
        setMinisters(ministersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Minister)));

        const announcementsSnap = await getDocs(query(collection(db, "announcements"), where("churchId", "==", id)));
        setAnnouncements(announcementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const livestreamsSnap = await getDocs(query(collection(db, "livestreams"), where("churchId", "==", id)));
        setLivestreams(livestreamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (canViewMembers) {
          const membersSnap = await getDocs(query(collection(db, "members"), where("churchId", "==", id)));
          setMembers(membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          const usersSnap = await getDocs(query(collection(db, "users"), where("churchId", "==", id)));
          setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

      } catch (error) {
        console.error("Error fetching church details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, canViewMembers]);

  const handleGetDirections = () => {
    if (!church) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${church.location.lat},${church.location.lng}`;
    window.open(url, "_blank");
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-700" /></div>;
  if (!church) return <div className="p-8 text-center text-slate-500">Church not found.</div>;

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="max-w-7xl mx-auto md:grid md:grid-cols-2 md:gap-8 md:p-8">
        <div className="relative h-64 md:h-[400px] overflow-hidden md:rounded-3xl shadow-lg">
          <img
            src={church.images?.[0] || `https://picsum.photos/seed/${church.id}/1200/800`}
            alt={church.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all">
              <Heart size={20} className={cn(profile?.favorites.includes(church.id) && "fill-red-500 text-red-500")} />
            </button>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all">
              <Share2 size={20} />
            </button>
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-2xl md:text-3xl font-bold">{church.name}</h2>
            <p className="text-sm md:text-base opacity-90 flex items-center gap-1">
              <MapPin size={14} /> {church.district}, {church.region}
            </p>
          </div>
        </div>

        <div className="p-4 md:p-0 space-y-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleGetDirections}
              className="flex-1 min-w-[160px] bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 active:scale-95 transition-all"
            >
              <Navigation size={18} /> Get Directions
            </button>
            
            {(profile?.role === "admin" || (profile?.role === "church_admin" && profile?.churchId === id)) && (
              <button
                onClick={() => navigate("/admin")}
                className="flex-1 min-w-[160px] bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Shield size={18} /> Manage Data
              </button>
            )}

            <a
              href={`tel:${church.contact}`}
              className="w-14 h-14 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all"
            >
              <Phone size={20} />
            </a>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">Address</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{church.address}</p>
          </div>

          <div className="border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                  <input type="date" className="p-2 border rounded-lg text-sm" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                  <input type="date" className="p-2 border rounded-lg text-sm" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                </div>
                <button onClick={handleSearch} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold mt-4">Search</button>
              </div>
            </div>
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
              {[
                { id: "services", icon: Clock, label: "Services" },
                { id: "ministers", icon: Users, label: "Ministers" },
                { id: "announcements", icon: Bell, label: "News" },
                { id: "livestreams", icon: Tv, label: "Live" },
                canViewMembers && { id: "members", icon: Users, label: "Members" },
                canViewMembers && { id: "users", icon: Users, label: "Users" },
              ].filter(Boolean).map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-emerald-700 text-emerald-700"
                      : "border-transparent text-slate-400"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {activeTab === "services" && (
              <div className="space-y-3">
                {(filteredData.length > 0 ? filteredData : services).map(service => (
                  <div key={service.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800">{service.name}</h4>
                      <p className="text-emerald-700 text-xs font-bold mt-1">{service.schedule}</p>
                      <p className="text-slate-500 text-xs mt-2">{service.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information"><Eye size={16} /></button>
                      <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                    </div>
                  </div>
                ))}
                {services.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No services listed yet.</p>}
              </div>
            )}

            {activeTab === "ministers" && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <button onClick={exportToPDF} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileText size={14} /> PDF</button>
                  <button onClick={exportToExcel} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(filteredData.length > 0 ? filteredData : ministers).map(minister => (
                    <div key={minister.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                          <Users size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{minister.name}</h4>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">{minister.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information"><Eye size={16} /></button>
                        <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {ministers.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 text-sm">No ministers listed yet.</p>}
                </div>
              </div>
            )}

            {activeTab === "members" && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <button onClick={exportToPDF} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileText size={14} /> PDF</button>
                  <button onClick={exportToExcel} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(filteredData.length > 0 ? filteredData : members).map(member => (
                    <div key={member.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{member.fullName}</h4>
                        <p className="text-slate-500 text-xs mt-1">{member.phone || "No phone"}</p>
                        <span className={cn(
                          "inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-2",
                          member.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        )}>
                          {member.status}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information"><Eye size={16} /></button>
                        <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 text-sm">No members listed yet.</p>}
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <button onClick={exportToPDF} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileText size={14} /> PDF</button>
                  <button onClick={exportToExcel} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(filteredData.length > 0 ? filteredData : users).map(user => (
                    <div key={user.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{user.fullName}</h4>
                        <p className="text-slate-500 text-xs mt-1">{user.email}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">{user.role.replace('_', ' ')}</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information"><Eye size={16} /></button>
                        <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 text-sm">No users listed yet.</p>}
                </div>
              </div>
            )}

            {activeTab === "announcements" && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <button onClick={exportToPDF} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileText size={14} /> PDF</button>
                  <button onClick={exportToExcel} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</button>
                </div>
                <div className="space-y-4">
                  {(filteredData.length > 0 ? filteredData : announcements).map(ann => (
                    <div key={ann.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800">{ann.title}</h4>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold uppercase">
                            {ann.category}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">{ann.content}</p>
                        <p className="text-[10px] text-slate-400 mt-4">
                          {formatDate(ann.date)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information"><Eye size={16} /></button>
                        <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {announcements.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No announcements listed yet.</p>}
                </div>
              </div>
            )}

            {activeTab === "livestreams" && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <button onClick={exportToPDF} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileText size={14} /> PDF</button>
                  <button onClick={exportToExcel} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</button>
                </div>
                <div className="space-y-4">
                  {(filteredData.length > 0 ? filteredData : livestreams).map(live => (
                    <div key={live.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-slate-800">{live.title}</h4>
                            <p className="text-slate-500 text-xs mt-1">{live.description}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${live.status === 'live' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                            {live.status}
                          </span>
                        </div>
                        <a 
                          href={live.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                        >
                          <Tv size={18} />
                          Watch Stream
                        </a>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information"><Eye size={16} /></button>
                        <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {livestreams.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <Tv size={32} className="mx-auto mb-2 opacity-20" />
                      <p>No livestreams scheduled.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
