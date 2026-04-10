import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, Clock, Users, Bell, Tv, ArrowLeft, Navigation, Heart, Share2, Loader2, Shield, FileText, FileSpreadsheet, Database, Eye, X, ImageIcon, DollarSign } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { cn, formatDate, getChurchImage } from "../lib/utils";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { api } from "../api";

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
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"services" | "ministers" | "announcements" | "members" | "users" | "livestreams" | null>(null);
  const [modalFilteredData, setModalFilteredData] = useState<any[]>([]);

  const handleSearch = () => {
    const tabToFilter = showModal ? modalTab : activeTab;
    let data: any[] = [];
    switch (tabToFilter) {
      case "services": data = services; break;
      case "ministers": data = ministers; break;
      case "announcements": data = announcements; break;
      case "members": data = members; break;
      case "users": data = users; break;
      case "livestreams": data = livestreams; break;
    }

    const filtered = data.filter(item => {
      const dateValue = item.createdAt || item.date;
      if (!dateValue) return !dateRange.start && !dateRange.end;
      
      const date = new Date(dateValue);

      if (isNaN(date.getTime())) return !dateRange.start && !dateRange.end;

      const itemDate = date.toISOString().split('T')[0];
      let matchesDate = true;
      if (dateRange.start && itemDate < dateRange.start) matchesDate = false;
      if (dateRange.end && itemDate > dateRange.end) matchesDate = false;
      return matchesDate;
    });

    if (showModal) {
      setModalFilteredData(filtered);
    } else {
      setFilteredData(filtered);
    }
  };

  useEffect(() => {
    if (showModal && modalTab) {
      handleSearch();
    }
  }, [showModal, modalTab]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tab = (showModal ? modalTab : activeTab) || "report";
    const data = showModal ? modalFilteredData : (filteredData.length > 0 ? filteredData : []);
    if (data.length === 0) { toast.error("No data to export"); return; }
    
    autoTable(doc, {
      head: [Object.keys(data[0])],
      body: data.map(item => Object.values(item)),
    });
    doc.save(`${tab}_report.pdf`);
  };

  const exportToExcel = () => {
    const tab = (showModal ? modalTab : activeTab) || "report";
    const data = showModal ? modalFilteredData : (filteredData.length > 0 ? filteredData : []);
    if (data.length === 0) { toast.error("No data to export"); return; }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab);
    XLSX.writeFile(wb, `${tab}_report.xlsx`);
  };

  const canViewMembers = profile?.role === "admin" || 
                        (profile?.role === "church_admin" && profile?.churchId === id) || 
                        (profile?.role === "church_end_user" && profile?.churchId === id);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        const churches = await api.getChurches();
        const churchData = churches.find(c => c.id === id);
        if (churchData) {
          setChurch(churchData);
        }

        const servicesData = await api.getEntities("services", id);
        setServices(servicesData);

        const ministersData = await api.getEntities("ministers", id);
        setMinisters(ministersData);

        const announcementsData = await api.getEntities("announcements", id);
        setAnnouncements(announcementsData);

        const livestreamsData = await api.getEntities("livestreams", id);
        setLivestreams(livestreamsData);

        if (canViewMembers) {
          const membersData = await api.getEntities("members", id);
          setMembers(membersData);
          
          // For users, we might need a specific endpoint or filter the global list
          // But for now, let's assume we fetch them similarly if the API supports it
          const usersData = await api.getEntities("users", id); // This might need server-side support
          setUsers(usersData);
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

  const toggleFavorite = async () => {
    if (!profile || !id) {
      toast.error("Please sign in to save favorites");
      return;
    }

    const isFavorite = profile.favorites.includes(id);
    try {
      const newFavorites = isFavorite 
        ? profile.favorites.filter(favId => favId !== id)
        : [...profile.favorites, id];
        
      await api.updateUserProfile(profile.id, {
        favorites: newFavorites
      });
      
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
      window.location.reload();
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("Failed to update favorites");
    }
  };

  const handleShare = async () => {
    if (!church) return;
    const shareData = {
      title: church.name,
      text: `Check out ${church.name} on SDA Tanzania`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-700" /></div>;
  if (!church) return <div className="p-8 text-center text-slate-500">Church not found.</div>;

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="max-w-7xl mx-auto md:grid md:grid-cols-2 md:gap-8 md:p-8">
        <div className="relative h-64 md:h-[400px] overflow-hidden md:rounded-3xl shadow-lg bg-slate-100 flex items-center justify-center">
          {church.images && church.images.length > 0 ? (
            <img 
              src={church.images[0]} 
              alt={church.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-slate-300 flex flex-col items-center gap-2">
              <ImageIcon size={64} strokeWidth={1} />
              <span className="text-xs font-bold uppercase tracking-widest opacity-50">No Image Available</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={toggleFavorite}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
            >
              <Heart size={20} className={cn(profile?.favorites.includes(church.id) && "fill-red-500 text-red-500")} />
            </button>
            <button 
              onClick={handleShare}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
            >
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
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{church.name}</h1>
              <p className="text-sm text-slate-500 font-medium">Church Management Dashboard</p>
            </div>
          </div>

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

                {(profile?.role === "admin" || (profile?.role === "church_admin" && profile?.churchId === id) || (profile?.role === "treasurer" && profile?.churchId === id)) && (
                  <button
                    onClick={() => navigate(`/church/${id}/treasurer`)}
                    className="flex-1 min-w-[160px] bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    <DollarSign size={18} /> Treasurer
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8 border-y border-slate-100">
                {[
                  { id: "services", icon: Clock, label: "Services", count: services.length, public: true },
                  { id: "ministers", icon: Users, label: "Ministers", count: ministers.length, public: true },
                  { id: "announcements", icon: Bell, label: "News", count: announcements.length, public: true },
                  { id: "livestreams", icon: Tv, label: "Live", count: livestreams.length, public: true },
                  { id: "members", icon: Users, label: "Members", count: members.length, public: false },
                  { id: "users", icon: Users, label: "Users", count: users.length, public: false },
                ].filter(m => m.public || profile?.role === "admin" || (profile?.role === "church_admin" && profile?.churchId === id) || (profile?.role === "church_end_user" && profile?.churchId === id)).map((module) => (
                  <div key={module.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center">
                        <module.icon size={24} />
                      </div>
                      <span className="text-3xl font-bold text-slate-800">{module.count}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{module.label}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Records</p>
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                      <button
                        onClick={() => {
                          setModalTab(module.id as any);
                          setShowModal(true);
                          setModalFilteredData([]);
                        }}
                        className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
                      >
                        <Eye size={16} /> View Information
                      </button>
                      {(profile?.role === "admin" || (profile?.role === "church_admin" && profile?.churchId === id)) && (
                        <button
                          onClick={() => navigate(`/admin?tab=${module.id === 'announcements' ? 'announcements' : module.id}&churchId=${id}`)}
                          className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                        >
                          <Database size={16} /> Manage Data
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
                        <div className="flex flex-col gap-2 shrink-0">
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
                          <div className="flex flex-col gap-2 shrink-0">
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
                          <div className="flex flex-col gap-2 shrink-0">
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
                          <div className="flex flex-col gap-2 shrink-0">
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
                          <div className="flex flex-col gap-2 shrink-0">
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
                          <div className="flex flex-col gap-2 shrink-0">
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

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white shadow-md text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-50 transition-all z-10 border border-slate-100"
            >
              <X size={20} />
            </button>

            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 capitalize">{modalTab} Information</h2>
                <p className="text-sm text-slate-500">View and export {modalTab} data</p>
              </div>
              <div className="flex gap-2 mr-12">
                <button onClick={exportToPDF} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-900 transition-all">
                  <FileText size={16} /> Export PDF
                </button>
                <button onClick={exportToExcel} className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-800 transition-all">
                  <FileSpreadsheet size={16} /> Export Excel
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                    <input type="date" className="p-2 border rounded-lg text-sm" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                    <input type="date" className="p-2 border rounded-lg text-sm" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                  </div>
                  <button 
                    onClick={handleSearch} 
                    className="px-6 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold mt-4"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(modalFilteredData.length > 0 ? modalFilteredData : (
                  modalTab === "services" ? services :
                  modalTab === "ministers" ? ministers :
                  modalTab === "announcements" ? announcements :
                  modalTab === "members" ? members :
                  modalTab === "users" ? users :
                  modalTab === "livestreams" ? livestreams : []
                )).map((item: any) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {modalTab === "services" && (
                      <div>
                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                        <p className="text-emerald-700 text-xs font-bold">{item.schedule}</p>
                        <p className="text-slate-500 text-xs mt-1">{item.description}</p>
                      </div>
                    )}
                    {modalTab === "ministers" && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                          <Users size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{item.role}</p>
                        </div>
                      </div>
                    )}
                    {modalTab === "members" && (
                      <div>
                        <h4 className="font-bold text-slate-800">{item.fullName}</h4>
                        <p className="text-slate-500 text-xs">{item.phone || "No phone"}</p>
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-2 bg-emerald-100 text-emerald-700">
                          {item.status}
                        </span>
                      </div>
                    )}
                    {modalTab === "users" && (
                      <div>
                        <h4 className="font-bold text-slate-800">{item.fullName}</h4>
                        <p className="text-slate-500 text-xs">{item.email}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">{item.role?.replace('_', ' ')}</p>
                      </div>
                    )}
                    {modalTab === "announcements" && (
                      <div>
                        <h4 className="font-bold text-slate-800">{item.title}</h4>
                        <p className="text-slate-600 text-sm mt-1">{item.content || item.description}</p>
                        <p className="text-[10px] text-slate-400 mt-2">{formatDate(item.date)}</p>
                      </div>
                    )}
                    {modalTab === "livestreams" && (
                      <div>
                        <h4 className="font-bold text-slate-800">{item.title || item.url}</h4>
                        <p className="text-slate-500 text-xs">{item.description || item.status}</p>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 text-xs font-bold mt-2 block">Watch Stream</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}