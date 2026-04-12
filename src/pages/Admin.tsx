import { useState, useEffect } from "react";
import { api } from "../api";
import { initialChurches } from "../data/initialChurches";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Church as ChurchIcon, Users, Bell, Tv, MapPin, Image as ImageIcon, Loader2, Database, Lock, Search, FileText, FileSpreadsheet, Printer, ChevronDown, Eye, DollarSign, List, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { cn, formatDate } from "../lib/utils";
import { useDownloads } from "../contexts/DownloadContext";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function Admin() {
  const { profile, isAdmin, isChurchAdmin, isTreasurer, loading: authLoading } = useAuth();
  const { addDownload } = useDownloads();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"churches" | "users" | "members" | "services" | "ministers" | "announcements" | "livestreams" | "settings" | "accounts">("churches");

  useEffect(() => {
    const tab = searchParams.get("tab");
    const churchId = searchParams.get("churchId");
    
    if (tab) {
      const validTabs = ["churches", "users", "members", "services", "ministers", "announcements", "livestreams", "settings", "accounts"];
      if (validTabs.includes(tab)) {
        setActiveTab(tab as any);
      }
    }
    
    if (churchId) {
      setSelectedChurchFilter(churchId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && isTreasurer && !isAdmin && !isChurchAdmin) {
      setActiveTab("accounts");
    }
  }, [authLoading, isTreasurer, isAdmin, isChurchAdmin]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [featureFilter, setFeatureFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  // Form states
  const [churchForm, setChurchForm] = useState({
    id: "", name: "", region: "", district: "", address: "", lat: "", lng: "", contact: "", image: null as File | null
  });

  const [userForm, setUserForm] = useState({
    id: "", fullName: "", email: "", role: "church_end_user" as any, churchId: ""
  });

  const [memberForm, setMemberForm] = useState({
    id: "", fullName: "", email: "", phone: "", address: "", status: "Active" as any, churchId: ""
  });

  const [serviceForm, setServiceForm] = useState({
    id: "", name: "", schedule: "", description: "", churchId: ""
  });

  const [ministerForm, setMinisterForm] = useState({
    id: "", name: "", role: "", contact: "", churchId: ""
  });

  const [announcementForm, setAnnouncementForm] = useState({
    id: "", title: "", description: "", date: "", imageUrl: "", churchId: "", category: "News"
  });

  const [livestreamForm, setLivestreamForm] = useState({
    id: "", url: "", status: "Offline" as any, churchId: ""
  });

  const [offeringCategoryForm, setOfferingCategoryForm] = useState({
    id: "", name: "", churchId: ""
  });

  const [offeringForm, setOfferingForm] = useState({
    id: "", memberId: "", categoryId: "", amount: "", date: new Date().toISOString().split('T')[0], churchId: ""
  });

  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const [appSettings, setAppSettings] = useState({ maintenanceMode: false, publicSignups: true });

  useEffect(() => {
    if (!isAdmin) return;
    const fetchSettings = async () => {
      try {
        const config = await api.getEntities("config");
        const globalConfig = config.find((c: any) => c.id === "global");
        if (globalConfig) {
          setAppSettings(globalConfig);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

  const ChurchFilter = ({ feature }: { feature: string }) => {
    if (!isAdmin) return null;
    return (
      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="font-bold text-emerald-800">{feature.charAt(0).toUpperCase() + feature.slice(1)} Church Filter</h4>
          <p className="text-xs text-emerald-600">Select a church and date range to view its specific {feature}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="p-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px] font-bold text-slate-700"
            value={selectedChurchFilter}
            onChange={(e) => setSelectedChurchFilter(e.target.value)}
          >
            <option value="">{feature === 'users' ? 'Super Admins (Public)' : 'Select a Church'}</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {feature === 'users' && (
            <select
              className="p-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px] font-bold text-slate-700"
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="online_user">Online Users</option>
              <option value="church_admin">Church Admins</option>
              <option value="church_end_user">Church End Users</option>
            </select>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-emerald-600 uppercase">Start Date</label>
            <input
              type="date"
              className="p-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-emerald-600 uppercase">End Date</label>
            <input
              type="date"
              className="p-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  };

  const getFilteredData = (feature: string, data: any[]) => {
    return data.filter(item => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchStr)
      );

      let matchesDate = true;
      if (dateRange.start || dateRange.end) {
        const rawDate = item.createdAt || item.date;
        if (!rawDate) {
          matchesDate = false;
        } else {
          let d: Date;
          if (rawDate && typeof rawDate.toDate === 'function') {
            d = rawDate.toDate();
          } else {
            d = new Date(rawDate);
          }

          if (isNaN(d.getTime())) {
            matchesDate = false;
          } else {
            const itemDate = d.toISOString().split('T')[0];
            if (dateRange.start && itemDate < dateRange.start) matchesDate = false;
            if (dateRange.end && itemDate > dateRange.end) matchesDate = false;
          }
        }
      }

      if (isAdmin) {
        if (feature === 'users') {
          let matchesUserType = true;
          if (userTypeFilter !== 'all') {
            matchesUserType = item.role === userTypeFilter;
          }
          
          if (selectedChurchFilter === "") {
            if (userTypeFilter === 'all') {
              return matchesSearch && matchesDate && item.role === 'admin';
            }
            return matchesSearch && matchesDate && matchesUserType;
          }
          return matchesSearch && matchesDate && item.churchId === selectedChurchFilter && matchesUserType;
        }
        
        if (selectedChurchFilter === "") return false;
        return matchesSearch && matchesDate && item.churchId === selectedChurchFilter;
      }
      return matchesSearch && matchesDate;
    });
  };

  const toggleSetting = async (key: keyof typeof appSettings) => {
    try {
      const newVal = !appSettings[key];
      await api.updateEntity("config", "global", { [key]: newVal });
      setAppSettings(prev => ({ ...prev, [key]: newVal }));
      toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`);
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    }
  };

  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [ministers, setMinisters] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [livestreams, setLivestreams] = useState<any[]>([]);
  const [offeringCategories, setOfferingCategories] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin && !isChurchAdmin) {
      navigate("/");
      toast.error("Access denied. Authorized personnel only.");
    }
  }, [isAdmin, isChurchAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || (!isAdmin && !isChurchAdmin && !isTreasurer)) return;

      try {
        // Fetch Churches
        const churchesList = await api.getChurches();
        if (!isAdmin && (isChurchAdmin || isTreasurer) && profile?.churchId) {
          setChurches(churchesList.filter(c => c.id === profile.churchId));
        } else {
          setChurches(churchesList);
        }
      } catch (error) {
        console.error("Error fetching churches:", error);
      }

      try {
        // Fetch Members
        const membersData = await api.getEntities("members", (!isAdmin && (isChurchAdmin || isTreasurer)) ? profile?.churchId : undefined);
        setMembers(membersData);
      } catch (error) {
        console.error("Error fetching members:", error);
      }

      try {
        // Fetch Services
        const servicesData = await api.getEntities("services", (!isAdmin && (isChurchAdmin || isTreasurer)) ? profile?.churchId : undefined);
        setServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
      }

      try {
        // Fetch Ministers
        const ministersData = await api.getEntities("ministers", (!isAdmin && (isChurchAdmin || isTreasurer)) ? profile?.churchId : undefined);
        setMinisters(ministersData);
      } catch (error) {
        console.error("Error fetching ministers:", error);
      }

      try {
        // Fetch Announcements
        const announcementsData = await api.getEntities("announcements", (!isAdmin && (isChurchAdmin || isTreasurer)) ? profile?.churchId : undefined);
        setAnnouncements(announcementsData);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }

      try {
        // Fetch Livestreams
        const livestreamsData = await api.getEntities("livestreams", (!isAdmin && (isChurchAdmin || isTreasurer)) ? profile?.churchId : undefined);
        setLivestreams(livestreamsData);
      } catch (error) {
        console.error("Error fetching livestreams:", error);
      }

      try {
        // Fetch Offering Categories
        const categoriesData = await api.getEntities("offering_categories", (!isAdmin && (isChurchAdmin || isTreasurer)) ? profile?.churchId : undefined);
        setOfferingCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }

      try {
        // Fetch Offerings
        const offeringsData = await api.getEntities("offerings", (!isAdmin && (isChurchAdmin || isTreasurer)) ? profile?.churchId : undefined);
        setOfferings(offeringsData);
      } catch (error) {
        console.error("Error fetching offerings:", error);
      }
    };
    fetchData();
  }, [isAdmin, isChurchAdmin, authLoading, profile?.churchId]);

  useEffect(() => {
    if (authLoading || (!isAdmin && !isChurchAdmin)) return;

    const fetchUsers = async () => {
      try {
        const usersData = await api.getEntities("users", (!isAdmin && isChurchAdmin) ? profile?.churchId : undefined);
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
    // In a real app, we might set up a polling interval or WebSocket here
  }, [authLoading, isAdmin, isChurchAdmin, profile?.churchId]);

  const regionsWithDistricts: Record<string, string[]> = {
    "Arusha": ["Arusha City", "Arusha DC", "Meru", "Monduli", "Karatu", "Ngorongoro", "Longido"],
    "Dar es Salaam": ["Ilala", "Kinondoni", "Temeke", "Kigamboni", "Ubungo"],
    "Dodoma": ["Dodoma City", "Bahi", "Chamwino", "Chemba", "Kondoa", "Kongwa", "Mpwapwa"],
    "Geita": ["Geita Town", "Geita DC", "Bukombe", "Chato", "Mbogwe", "Nyang'hwale"],
    "Iringa": ["Iringa Municipal", "Iringa DC", "Kilolo", "Mufindi"],
    "Kagera": ["Bukoba Municipal", "Bukoba DC", "Biharamulo", "Karagwe", "Kyerwa", "Missenyi", "Muleba", "Ngara"],
    "Katavi": ["Mpanda Town", "Mpanda DC", "Mlele"],
    "Kigoma": ["Kigoma-Ujiji Municipal", "Kigoma DC", "Kasulu Town", "Kasulu DC", "Kibondo", "Kakonko", "Uvinza"],
    "Kilimanjaro": ["Moshi Municipal", "Moshi DC", "Hai", "Siha", "Rombo", "Mwanga", "Same"],
    "Lindi": ["Lindi Municipal", "Lindi DC", "Kilwa", "Liwale", "Nachingwewe", "Ruangwa"],
    "Manyara": ["Babati Town", "Babati DC", "Hanang", "Kiteto", "Mbulu", "Simanjiro"],
    "Mara": ["Musoma Municipal", "Musoma DC", "Bunda", "Butiama", "Rorya", "Serengeti", "Tarime"],
    "Mbeya": ["Mbeya City", "Mbeya DC", "Chunya", "Kyela", "Mbarali", "Rungwe"],
    "Morogoro": ["Morogoro Municipal", "Morogoro DC", "Gairo", "Kilombero", "Kilosa", "Mvomero", "Ulanga", "Malinyi"],
    "Mtwara": ["Mtwara Municipal", "Mtwara DC", "Masasi Town", "Masasi DC", "Nanyumbu", "Newala", "Tandahimba"],
    "Mwanza": ["Ilemela", "Nyamagana", "Buchosa", "Magu", "Misungwi", "Kwimba", "Sengerema", "Ukerewe"],
    "Njombe": ["Njombe Town", "Njombe DC", "Ludewa", "Makete", "Wanging'ombe"],
    "Pemba North": ["Wete", "Micheweni"],
    "Pemba South": ["Chake Chake", "Mkoani"],
    "Pwani": ["Kibaha Town", "Kibaha DC", "Bagamoyo", "Kisarawe", "Mafia", "Mkuranga", "Rufiji"],
    "Rukwa": ["Sumbawanga Municipal", "Sumbawanga DC", "Kalambo", "Nkasi"],
    "Ruvuma": ["Songea Municipal", "Songea DC", "Mbinga", "Namtumbo", "Nyasa", "Tunduru"],
    "Shinyanga": ["Shinyanga Municipal", "Shinyanga DC", "Kahama Town", "Kahama DC", "Kishapu"],
    "Simiyu": ["Bariadi Town", "Bariadi DC", "Busega", "Itilima", "Maswa", "Meatu"],
    "Singida": ["Singida Municipal", "Singida DC", "Ikungi", "Iramba", "Manyoni", "Mkalama"],
    "Songwe": ["Mbozi", "Ileje", "Momba", "Songwe"],
    "Tabora": ["Tabora Municipal", "Uyui", "Igunga", "Kaliua", "Nzega", "Sikonge", "Urambo"],
    "Tanga": ["Tanga City", "Handeni Town", "Handeni DC", "Kilindi", "Korogwe Town", "Korogwe DC", "Lushoto", "Mkinga", "Muheza", "Pangani"],
    "Zanzibar North": ["Kaskazini A", "Kaskazini B"],
    "Zanzibar South and Central": ["Kati", "Kusini"],
    "Zanzibar West": ["Mjini", "Magharibi"]
  };

  const regions = Object.keys(regionsWithDistricts);

  const filteredOfferings = offerings.filter(off => !selectedChurchFilter || off.churchId === selectedChurchFilter);
  const totalOfferings = filteredOfferings.reduce((sum, off) => sum + Number(off.amount), 0);
  
  const offeringsByCategory = offeringCategories
    .filter(cat => !selectedChurchFilter || cat.churchId === selectedChurchFilter)
    .map(cat => ({
      name: cat.name,
      value: filteredOfferings.filter(off => off.categoryId === cat.id).reduce((sum, off) => sum + Number(off.amount), 0)
    }))
    .filter(item => item.value > 0);

  const offeringsByMonth = filteredOfferings.reduce((acc: any, off) => {
    const month = new Date(off.date).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + Number(off.amount);
    return acc;
  }, {});

  const chartData = Object.keys(offeringsByMonth).map(month => ({
    name: month,
    amount: offeringsByMonth[month]
  }));

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#064e3b', '#065f46', '#047857'];

  const handleAddChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isAdmin && !churchForm.id) {
        toast.error("Church Admins cannot create new churches. Please contact a Super Admin.");
        setLoading(false);
        return;
      }

      console.log("Starting church update/add:", churchForm);
      let imageUrl = "";
      if (churchForm.image) {
        try {
          console.log("Uploading image:", churchForm.image.name);
          imageUrl = await api.uploadImage(churchForm.image);
          console.log("Image uploaded, URL:", imageUrl);
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload image to local server.");
        }
      }

      const churchData: any = {
        name: churchForm.name,
        region: churchForm.region,
        district: churchForm.district,
        address: churchForm.address,
        location: { lat: parseFloat(churchForm.lat), lng: parseFloat(churchForm.lng) },
        contact: churchForm.contact,
      };
      if (imageUrl) {
        churchData.images = [imageUrl];
      } else if (!churchForm.id) {
        churchData.images = [];
      }
      console.log("Church data to save:", churchData);

      if (churchForm.id) {
        // Update
        await api.updateChurch(churchForm.id, churchData);
        toast.success("Church updated successfully!");
      } else {
        // Add
        await api.addChurch(churchData);
        toast.success("Church added successfully!");
      }
      
      // Refresh churches
      const updatedChurches = await api.getChurches();
      setChurches(updatedChurches);
      
      setChurchForm({ id: "", name: "", region: "", district: "", address: "", lat: "", lng: "", contact: "", image: null });
    } catch (error: any) {
      console.error("Error in handleAddChurch:", error);
      if (error.code === 'storage/retry-limit-exceeded') {
        toast.error("Upload failed: Max retry time exceeded. This is almost always a CORS issue. Please run the 'gsutil cors set' command provided in our chat.");
      } else if (error.message?.includes('CORS')) {
        toast.error("Upload failed: CORS error. Please configure your Firebase Storage CORS settings.");
      } else {
        toast.error("Failed to update church: " + (error.message || "Unknown error occurred"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = userForm.email.trim().toLowerCase();
      if (userForm.id) {
        // Update existing user profile
        const updateData = {
          fullName: userForm.fullName,
          email: email,
          role: userForm.role,
          churchId: userForm.churchId || ((isChurchAdmin || isTreasurer) ? profile?.churchId : ""),
        };
        await api.updateUserProfile(userForm.id, updateData);
        toast.success("User updated successfully!");
        setUsers(users.map(u => u.id === userForm.id ? { ...u, ...updateData } : u));
      } else {
        // Create new user:
        // 1. Create Auth account with email as default password using secondary app
        const secondaryApp = initializeApp(firebaseConfig, `Secondary_${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);
        
        // Ensure password is at least 6 chars
        const defaultPassword = email.length >= 6 ? email : `${email}123456`.slice(0, 8);

        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, defaultPassword);
          const uid = userCredential.user.uid;
          
          // 2. Create local profile
          const userData = {
            id: uid,
            fullName: userForm.fullName,
            email: email,
            role: userForm.role,
            churchId: userForm.churchId || ((isChurchAdmin || isTreasurer) ? profile?.churchId : ""),
            favorites: [],
            mustChangePassword: true,
          };
          
          await api.createUserProfile(userData);
          setUsers([{ id: uid, ...userData }, ...users]);
          toast.success(`User created! Default password is: ${defaultPassword}`);
          
          // Sign out of secondary app to be clean
          await signOut(secondaryAuth);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
             // If auth exists but profile doesn't, just create profile
             toast.info("Auth account already exists. Creating profile only.");
             const userData = {
              fullName: userForm.fullName,
              email: email,
              role: userForm.role,
              churchId: userForm.churchId || ((isChurchAdmin || isTreasurer) ? profile?.churchId : ""),
              favorites: [],
              mustChangePassword: true,
              createdAt: new Date().toISOString(),
            };
            const result = await api.createUserProfile(userData);
            setUsers([{ id: result.id, ...userData }, ...users]);
          } else {
            throw authErr;
          }
        }
      }
      
      setUserForm({ id: "", fullName: "", email: "", role: "church_end_user", churchId: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm("This will seed the database with initial church data. Continue?")) return;
    setLoading(true);
    try {
      await api.seedData(initialChurches);
      toast.success("Database seeded successfully!");
      const updatedChurches = await api.getChurches();
      setChurches(updatedChurches);
    } catch (error) {
      console.error("Seeding error:", error);
      toast.error("Failed to seed database.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm("Force this user to change their password on next login?")) return;
    try {
      await api.updateUserProfile(userId, { mustChangePassword: true });
      toast.success("User will be prompted to change password on next login.");
      setUsers(users.map(u => u.id === userId ? { ...u, mustChangePassword: true } : u));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.deleteEntity("users", userId);
      toast.success("User deleted");
      setUsers(users.filter(u => u.id !== userId));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const churchId = isChurchAdmin ? profile?.churchId : memberForm.churchId;
      if (!churchId) {
        toast.error("Please select a church");
        setLoading(false);
        return;
      }

      const memberData = {
        fullName: memberForm.fullName,
        email: memberForm.email,
        phone: memberForm.phone,
        address: memberForm.address,
        status: memberForm.status,
        churchId: churchId,
        createdAt: memberForm.id ? undefined : new Date().toISOString(),
      };
      
      if (memberForm.id) {
        await api.updateEntity("members", memberForm.id, memberData);
        toast.success("Member updated successfully!");
        setMembers(members.map(m => m.id === memberForm.id ? { ...m, ...memberData } : m));
      } else {
        const result = await api.addEntity("members", memberData);
        setMembers([{ id: result.id, ...memberData }, ...members]);
        toast.success("Member added successfully!");
      }
      
      setMemberForm({ id: "", fullName: "", email: "", phone: "", address: "", status: "Active", churchId: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const churchId = isChurchAdmin ? profile?.churchId : serviceForm.churchId;
      if (!churchId) throw new Error("Church ID is required");

      const data = { ...serviceForm, churchId, createdAt: serviceForm.id ? undefined : new Date().toISOString() };
      const { id, ...rest } = data;

      if (id) {
        await api.updateEntity("services", id, rest);
        setServices(services.map(s => s.id === id ? { ...s, ...rest } : s));
        toast.success("Service updated");
      } else {
        const result = await api.addEntity("services", rest);
        setServices([{ id: result.id, ...rest }, ...services]);
        toast.success("Service added");
      }
      setServiceForm({ id: "", name: "", schedule: "", description: "", churchId: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMinister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const churchId = isChurchAdmin ? profile?.churchId : ministerForm.churchId;
      if (!churchId) throw new Error("Church ID is required");

      const data = { ...ministerForm, churchId, createdAt: ministerForm.id ? undefined : new Date().toISOString() };
      const { id, ...rest } = data;

      if (id) {
        await api.updateEntity("ministers", id, rest);
        setMinisters(ministers.map(m => m.id === id ? { ...m, ...rest } : m));
        toast.success("Minister updated");
      } else {
        const result = await api.addEntity("ministers", rest);
        setMinisters([{ id: result.id, ...rest }, ...ministers]);
        toast.success("Minister added");
      }
      setMinisterForm({ id: "", name: "", role: "", contact: "", churchId: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const churchId = isChurchAdmin ? profile?.churchId : announcementForm.churchId;
      if (!churchId) throw new Error("Church ID is required");

      const data = { ...announcementForm, churchId, date: announcementForm.date || new Date().toISOString() };
      const { id, ...rest } = data;

      if (id) {
        await api.updateEntity("announcements", id, rest);
        setAnnouncements(announcements.map(a => a.id === id ? { ...a, ...rest } : a));
        toast.success("Announcement updated");
      } else {
        const result = await api.addEntity("announcements", rest);
        setAnnouncements([{ id: result.id, ...rest }, ...announcements]);
        toast.success("Announcement added");
      }
      setAnnouncementForm({ id: "", title: "", description: "", date: "", imageUrl: "", churchId: "", category: "News" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLivestream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const churchId = isChurchAdmin ? profile?.churchId : livestreamForm.churchId;
      if (!churchId) throw new Error("Church ID is required");

      const data = { ...livestreamForm, churchId, createdAt: livestreamForm.id ? undefined : new Date().toISOString() };
      const { id, ...rest } = data;

      if (id) {
        await api.updateEntity("livestreams", id, rest);
        setLivestreams(livestreams.map(l => l.id === id ? { ...l, ...rest } : l));
        toast.success("Livestream updated");
      } else {
        const result = await api.addEntity("livestreams", rest);
        setLivestreams([{ id: result.id, ...rest }, ...livestreams]);
        toast.success("Livestream added");
      }
      setLivestreamForm({ id: "", url: "", status: "Offline", churchId: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm("Delete member?")) return;
    try {
      await api.deleteEntity("members", id);
      setMembers(members.filter(m => m.id !== id));
      toast.success("Member deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Delete service?")) return;
    try {
      await api.deleteEntity("services", id);
      setServices(services.filter(s => s.id !== id));
      toast.success("Service deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteMinister = async (id: string) => {
    if (!window.confirm("Delete minister?")) return;
    try {
      await api.deleteEntity("ministers", id);
      setMinisters(ministers.filter(m => m.id !== id));
      toast.success("Minister deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Delete announcement?")) return;
    try {
      await api.deleteEntity("announcements", id);
      setAnnouncements(announcements.filter(a => a.id !== id));
      toast.success("Announcement deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteLivestream = async (id: string) => {
    if (!window.confirm("Delete livestream?")) return;
    try {
      await api.deleteEntity("livestreams", id);
      setLivestreams(livestreams.filter(l => l.id !== id));
      toast.success("Livestream deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddOfferingCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const churchId = isChurchAdmin || isTreasurer ? profile?.churchId : offeringCategoryForm.churchId;
      if (!churchId) throw new Error("Church ID is required");

      const data = { name: offeringCategoryForm.name, churchId, createdAt: new Date().toISOString() };
      
      if (offeringCategoryForm.id) {
        await api.updateEntity("offering_categories", offeringCategoryForm.id, data);
        setOfferingCategories(offeringCategories.map(c => c.id === offeringCategoryForm.id ? { ...c, ...data } : c));
        toast.success("Category updated");
      } else {
        const result = await api.addEntity("offering_categories", data);
        setOfferingCategories([{ id: result.id, ...data }, ...offeringCategories]);
        toast.success("Category created");
      }
      setOfferingCategoryForm({ id: "", name: "", churchId: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const churchId = isChurchAdmin || isTreasurer ? profile?.churchId : offeringForm.churchId;
      if (!churchId) throw new Error("Church ID is required");

      const data = { 
        memberId: offeringForm.memberId,
        categoryId: offeringForm.categoryId,
        amount: parseFloat(offeringForm.amount),
        date: offeringForm.date,
        churchId,
        createdAt: new Date().toISOString()
      };
      
      const result = await api.addEntity("offerings", data);
      setOfferings([{ id: result.id, ...data }, ...offerings]);
      toast.success("Offering registered successfully");
      setOfferingForm({ id: "", memberId: "", categoryId: "", amount: "", date: new Date().toISOString().split('T')[0], churchId: "" });
      setSelectedMember(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFeatureData = (feature: string, churchId: string | null) => {
    if (!churchId) return [];
    switch (feature) {
      case "members": return members.filter(m => m.churchId === churchId);
      case "users": return users.filter(u => u.churchId === churchId);
      case "ministers": return ministers.filter(m => m.churchId === churchId);
      case "services": return services.filter(s => s.churchId === churchId);
      case "announcements": return announcements.filter(a => a.churchId === churchId);
      case "livestreams": return livestreams.filter(l => l.churchId === churchId);
      default: return [];
    }
  };

  const getTableHeaders = (feature: string) => {
    switch (feature) {
      case "members": return ["Name", "Phone", "Status", "Church", "Date Added"];
      case "users": return ["Name", "Email", "Role", "Church", "Date Added"];
      case "ministers": return ["Name", "Role", "Contact", "Church", "Date Added"];
      case "services": return ["Name", "Schedule", "Description", "Church", "Date Added"];
      case "announcements": return ["Title", "Date", "Category", "Church", "Date Added"];
      case "livestreams": return ["URL", "Status", "Church", "Date Added"];
      case "churches": return ["Name", "Region", "District", "Address"];
      default: return [];
    }
  };

  const getTableCells = (feature: string, item: any) => {
    const churchName = churches.find(c => c.id === item.churchId)?.name || "N/A";
    switch (feature) {
      case "members": return [item.fullName, item.phone || "N/A", item.status, churchName, formatDate(item.createdAt)];
      case "users": return [item.fullName, item.email, item.role.replace('_', ' '), churchName, formatDate(item.createdAt)];
      case "ministers": return [item.name, item.role, item.contact || "N/A", churchName, formatDate(item.createdAt)];
      case "services": return [item.name, item.schedule, item.description || "N/A", churchName, formatDate(item.createdAt)];
      case "announcements": return [item.title, formatDate(item.date), item.category || "News", churchName, formatDate(item.createdAt)];
      case "livestreams": return [item.url, item.status, churchName, formatDate(item.createdAt)];
      case "churches": return [item.name, item.region, item.district, item.address];
      default: return [];
    }
  };

  const handleEdit = (feature: string, item: any) => {
    setActiveTab(feature as any);
    switch (feature) {
      case "members": setMemberForm({ ...item, churchId: item.churchId || "", status: item.status || "Active" }); break;
      case "users": setUserForm({ ...item, churchId: item.churchId || "", role: item.role || "church_end_user" }); break;
      case "ministers": setMinisterForm({ ...item, churchId: item.churchId || "" }); break;
      case "services": setServiceForm({ ...item, churchId: item.churchId || "" }); break;
      case "announcements": setAnnouncementForm({ ...item, churchId: item.churchId || "" }); break;
      case "livestreams": setLivestreamForm({ ...item, churchId: item.churchId || "" }); break;
    }
  };

  const handleDelete = (feature: string, id: string) => {
    switch (feature) {
      case "members": handleDeleteMember(id); break;
      case "users": handleDeleteUser(id); break;
      case "ministers": handleDeleteMinister(id); break;
      case "services": handleDeleteService(id); break;
      case "announcements": handleDeleteAnnouncement(id); break;
      case "livestreams": handleDeleteLivestream(id); break;
    }
  };

  const generateCSV = (feature: string, data: any[]) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    try {
      const headers = getTableHeaders(feature);
      const rows = data.map(item => {
        return getTableCells(feature, item).map(cell => {
          const cellStr = String(cell || "");
          if (cellStr.includes(",") || cellStr.includes("\n") || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(",");
      });
      
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const fileName = `${feature}_report_${new Date().getTime()}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addDownload({ name: fileName, type: 'csv', url });
    } catch (error: any) {
      console.error("CSV Generation Error:", error);
      toast.error("Failed to generate CSV");
    }
  };

  const generatePDF = (feature: string, data: any[]) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    try {
      const doc = new jsPDF();
      const currentChurchId = selectedChurchId || selectedChurchFilter || (isChurchAdmin ? profile?.churchId : null);
      const churchName = churches.find(c => c.id === currentChurchId)?.name || (isChurchAdmin ? churches[0]?.name : "System Wide");
      
      doc.setFontSize(18);
      doc.setTextColor(5, 150, 105);
      doc.text(`${churchName} - ${feature.toUpperCase()} REPORT`, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

      const headers = [getTableHeaders(feature)];
      const rows = data.map(item => getTableCells(feature, item));

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 8 },
      });

      const fileName = `${feature}_report_${new Date().getTime()}.pdf`;
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();

      addDownload({ name: fileName, type: 'pdf', url });
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const generateExcel = (feature: string, data: any[]) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    try {
      const headers = getTableHeaders(feature);
      const rows = data.map(item => {
        const cells = getTableCells(feature, item);
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = cells[index];
        });
        return rowObj;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, feature.toUpperCase());
      
      const fileName = `${feature}_report_${new Date().getTime()}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(excelBlob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();

      addDownload({ name: fileName, type: 'xlsx', url });
    } catch (error: any) {
      console.error("Excel Generation Error:", error);
      toast.error("Failed to generate Excel");
    }
  };

  const generateFullReport = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const reportDate = new Date().toLocaleString();
      const currentChurchId = isAdmin ? null : profile?.churchId;
      const churchName = isAdmin ? "System Wide" : (churches.find(c => c.id === currentChurchId)?.name || "Church");
      
      doc.setFontSize(22);
      doc.setTextColor(5, 150, 105);
      doc.text(`${churchName.toUpperCase()} - FULL REPORT`, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${reportDate}`, 14, 28);
      doc.text(`Administrator: ${profile?.name || "System"}`, 14, 33);

      let yPos = 45;

      const sections = [
        { title: "CHURCHES", feature: "churches", data: isAdmin ? churches : churches.filter(c => c.id === currentChurchId) },
        { title: "USERS", feature: "users", data: users },
        { title: "MEMBERS", feature: "members", data: members },
        { title: "MINISTERS", feature: "ministers", data: ministers },
        { title: "SERVICES", feature: "services", data: services },
        { title: "NEWS & ANNOUNCEMENTS", feature: "announcements", data: announcements },
        { title: "LIVE STREAMS", feature: "livestreams", data: livestreams }
      ];

      for (const section of sections) {
        if (section.data.length > 0) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(14);
          doc.setTextColor(30, 41, 59);
          doc.text(section.title, 14, yPos);
          yPos += 5;

          autoTable(doc, {
            head: [getTableHeaders(section.feature)],
            body: section.data.map(item => getTableCells(section.feature, item)),
            startY: yPos,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] },
            styles: { fontSize: 8 },
            margin: { top: 20 }
          });

          yPos = (doc as any).lastAutoTable.finalY + 15;
        }
      }

      const fileName = `Full_Report_${new Date().getTime()}.pdf`;
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();

      addDownload({ name: fileName, type: 'pdf', url });
    } catch (error: any) {
      console.error("Full Report Generation Error:", error);
      toast.error("Failed to generate full report");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="bg-emerald-800 text-white p-4 md:p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{isAdmin ? "Super Admin Panel" : "Church Admin Panel"}</h2>
          <p className="text-emerald-100 text-xs md:text-sm opacity-80">
            {isAdmin ? "Full system management" : `Managing ${churches.find(c => c.id === profile?.churchId)?.name || "Church"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {isChurchAdmin && (
            <button
              onClick={() => setSelectedChurchId(profile?.churchId || null)}
              className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 px-3 md:px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold"
            >
              <ChurchIcon size={14} /> Church Dashboard
            </button>
          )}
          {(isAdmin || isChurchAdmin) && (
            <button
              onClick={generateFullReport}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-3 md:px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold shadow-lg shadow-emerald-900/20"
            >
              <FileText size={14} /> {isAdmin ? "Full Report" : "Church Report"}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleSeedData}
              disabled={loading}
              className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 px-3 md:px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold"
            >
              <Database size={14} /> Seed Data
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar no-print snap-x">
        {[
          isAdmin && { id: "churches", icon: ChurchIcon, label: "Churches" },
          isAdmin && { id: "users", icon: Users, label: "Users" },
          (isAdmin || isChurchAdmin || isTreasurer) && { id: "members", icon: Users, label: "Members" },
          (isAdmin || isChurchAdmin) && { id: "ministers", icon: ChurchIcon, label: "Ministers" },
          (isAdmin || isChurchAdmin) && { id: "services", icon: Bell, label: "Services" },
          (isAdmin || isChurchAdmin) && { id: "announcements", icon: Bell, label: "News" },
          (isAdmin || isChurchAdmin) && { id: "livestreams", icon: Tv, label: "Live" },
          (isAdmin || isChurchAdmin || isTreasurer) && { id: "accounts", icon: DollarSign, label: "Church Accounts" },
          isAdmin && { id: "settings", icon: Database, label: "Settings" },
        ].filter(Boolean).map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap snap-start",
              activeTab === tab.id
                ? "bg-emerald-700 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 no-print">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {activeTab === "churches" && (
          <div className="space-y-8">
            {selectedChurchId ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedChurchId(null)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
                    >
                      <ChevronDown className="rotate-90" size={24} />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">
                        {churches.find(c => c.id === selectedChurchId)?.name}
                      </h2>
                      <p className="text-slate-500">Church Management Dashboard</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[
                    { id: 'users', label: 'Users', icon: Users, count: users.filter(u => u.churchId === selectedChurchId).length },
                    { id: 'members', label: 'Members', icon: Users, count: members.filter(m => m.churchId === selectedChurchId).length },
                    { id: 'ministers', label: 'Ministers', icon: ChurchIcon, count: ministers.filter(m => m.churchId === selectedChurchId).length },
                    { id: 'services', label: 'Services', icon: Bell, count: services.filter(s => s.churchId === selectedChurchId).length },
                    { id: 'announcements', label: 'News', icon: Bell, count: announcements.filter(a => a.churchId === selectedChurchId).length },
                    { id: 'livestreams', label: 'Live', icon: Tv, count: livestreams.filter(l => l.churchId === selectedChurchId).length },
                  ].map(stat => (
                    <div
                      key={stat.id}
                      className="p-4 md:p-6 bg-white border border-slate-100 rounded-[24px] md:rounded-[32px] shadow-sm hover:shadow-md transition-all flex flex-col gap-3 md:gap-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-700 rounded-xl md:rounded-2xl flex items-center justify-center">
                          <stat.icon size={20} />
                        </div>
                        <span className="text-2xl md:text-3xl font-bold text-slate-800">{stat.count}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base md:text-lg">{stat.label}</h4>
                        <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Records</p>
                      </div>
                      <div className="flex flex-col gap-2 md:gap-3 mt-1 md:mt-2">
                        <button
                          onClick={() => {
                            setSelectedChurchFilter(selectedChurchId);
                            setActiveTab(stat.id as any);
                            setSelectedChurchId(null);
                          }}
                          className="w-full py-2.5 md:py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] md:text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedChurchFilter(selectedChurchId);
                            setActiveTab(stat.id as any);
                            setSelectedChurchId(null);
                          }}
                          className="w-full py-2.5 md:py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] md:text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                        >
                          <Database size={14} /> Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {(isAdmin || churchForm.id) && (
              <form onSubmit={handleAddChurch} className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                {churchForm.id ? "Edit Church" : "Add New Church"}
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Church Name"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={churchForm.name}
                  onChange={e => setChurchForm({ ...churchForm, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    required
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={churchForm.region}
                    onChange={e => setChurchForm({ ...churchForm, region: e.target.value, district: "" })}
                  >
                    <option value="">Select Region</option>
                    {regions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select
                    required
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={churchForm.district}
                    onChange={e => setChurchForm({ ...churchForm, district: e.target.value })}
                    disabled={!churchForm.region}
                  >
                    <option value="">Select District</option>
                    {churchForm.region && regionsWithDistricts[churchForm.region]?.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Physical Address"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={churchForm.address}
                  onChange={e => setChurchForm({ ...churchForm, address: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    required
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={churchForm.lat}
                    onChange={e => setChurchForm({ ...churchForm, lat: e.target.value })}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    required
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={churchForm.lng}
                    onChange={e => setChurchForm({ ...churchForm, lng: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Contact Info"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={churchForm.contact}
                  onChange={e => setChurchForm({ ...churchForm, contact: e.target.value })}
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="church-image"
                    onChange={e => setChurchForm({ ...churchForm, image: e.target.files?.[0] || null })}
                  />
                  <label
                    htmlFor="church-image"
                    className="w-full p-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center gap-2 text-slate-500 cursor-pointer hover:bg-slate-100 transition-all"
                  >
                    <ImageIcon size={18} />
                    {churchForm.image ? churchForm.image.name : "Upload Church Image"}
                  </label>
                </div>
              </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> {churchForm.id ? "Update Church" : "Add Church"}</>}
                  </button>
                  {churchForm.id && (
                    <button
                      type="button"
                      onClick={() => setChurchForm({ id: "", name: "", region: "", district: "", address: "", lat: "", lng: "", contact: "", image: null })}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
            </form>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Existing Churches</h3>
                <div className="flex gap-2">
                   <button 
                    onClick={() => {
                      const filtered = churches.filter(c => 
                        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c as any).region.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c as any).district.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      generatePDF("churches", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF Report
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = churches.filter(c => 
                        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c as any).region.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c as any).district.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      generateExcel("churches", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel Report
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {churches
                  .filter(c => 
                    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (c as any).region.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (c as any).district.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(church => (
                  <div 
                    key={church.id} 
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center cursor-pointer hover:border-emerald-500 transition-all"
                    onClick={() => setSelectedChurchId(church.id)}
                  >
                    <div>
                      <p className="font-bold text-slate-800">{church.name}</p>
                      <p className="text-xs text-slate-500">{(church as any).district}, {(church as any).region}</p>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                       <Link 
                        to={`/church/${church.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Church"
                      >
                        <Eye size={16} />
                      </Link>
                       <button 
                        onClick={() => setChurchForm({
                          id: church.id,
                          name: church.name,
                          region: (church as any).region,
                          district: (church as any).district,
                          address: (church as any).address,
                          lat: (church as any).location.lat.toString(),
                          lng: (church as any).location.lng.toString(),
                          contact: (church as any).contact || "",
                          image: null
                        })}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Church"
                      >
                        <Database size={16} />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if(window.confirm("Delete church?")) {
                              try {
                                await api.deleteChurch(church.id);
                                setChurches(churches.filter(c => c.id !== church.id));
                                toast.success("Church deleted");
                              } catch (error: any) {
                                toast.error("Failed to delete church: " + error.message);
                              }
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Church"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )}

        {activeTab === "users" && (
          <div className="space-y-8">
            <ChurchFilter feature="users" />
            <form onSubmit={handleAddUser} className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                {userForm.id ? "Edit User" : "Add New User"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={userForm.fullName}
                  onChange={e => setUserForm({ ...userForm, fullName: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                />
                <select
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value as any })}
                >
                  {isAdmin && <option value="admin">Super Admin</option>}
                  <option value="church_admin">Church Admin</option>
                  <option value="treasurer">Church Treasurer</option>
                  <option value="church_end_user">Church End-user</option>
                  <option value="online_user">Online User</option>
                </select>
                {(isAdmin || userForm.role === "church_admin" || userForm.role === "church_end_user" || userForm.role === "treasurer") && (
                  <select
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={userForm.churchId}
                    onChange={e => setUserForm({ ...userForm, churchId: e.target.value })}
                    required={userForm.role !== "admin" && userForm.role !== "online_user"}
                  >
                    <option value="">Select Church</option>
                    {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <>{userForm.id ? <Database size={20} /> : <Plus size={20} />} {userForm.id ? "Update User" : "Create User Profile"}</>}
                </button>
                {userForm.id && (
                  <button
                    type="button"
                    onClick={() => setUserForm({ id: "", fullName: "", email: "", role: "church_end_user", churchId: "" })}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">System Users</h3>
                <div className="flex gap-2">
                   <button 
                    onClick={() => {
                      const filtered = getFilteredData("users", users);
                      generatePDF("users", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF Report
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("users", users);
                      generateExcel("users", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel Report
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredData("users", users)
                  .map(user => (
                  <div key={user.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", user.status === 'online' && user.lastSeen && (new Date().getTime() - (typeof user.lastSeen?.toMillis === 'function' ? user.lastSeen.toMillis() : new Date(user.lastSeen).getTime()) < 5 * 60 * 1000) ? 'bg-emerald-500' : 'bg-slate-300')} />
                        <p className="font-bold text-slate-800">{user.fullName}</p>
                      </div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{user.role.replace('_', ' ')}</p>
                      {user.churchId && <p className="text-[10px] text-emerald-600">{churches.find(c => c.id === user.churchId)?.name}</p>}
                      {user.createdAt && <p className="text-[9px] text-slate-400 mt-1 italic">Added: {formatDate(user.createdAt)}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setUserForm({
                          id: user.id,
                          fullName: user.fullName,
                          email: user.email,
                          role: user.role,
                          churchId: user.churchId || ""
                        })}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={() => handleResetPassword(user.id)}
                        title="Reset Password"
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Lock size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete User"
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-8">
            <ChurchFilter feature="members" />
            <form onSubmit={handleAddMember} className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                {memberForm.id ? "Edit Church Member" : "Add Church Member"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={memberForm.fullName}
                  onChange={e => setMemberForm({ ...memberForm, fullName: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email (Optional)"
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={memberForm.email}
                  onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={memberForm.phone}
                  onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                />
                <select
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={memberForm.status}
                  onChange={e => setMemberForm({ ...memberForm, status: e.target.value as any })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {(isAdmin || !profile?.churchId) && (
                  <select
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={memberForm.churchId}
                    onChange={e => setMemberForm({ ...memberForm, churchId: e.target.value })}
                    required
                  >
                    <option value="">Select Church</option>
                    {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <>{memberForm.id ? <Database size={20} /> : <Plus size={20} />} {memberForm.id ? "Update Member" : "Add Member"}</>}
                </button>
                {memberForm.id && (
                  <button
                    type="button"
                    onClick={() => setMemberForm({ id: "", fullName: "", email: "", phone: "", address: "", status: "Active", churchId: "" })}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Church Members</h3>
                <div className="flex gap-2">
                   <button 
                    onClick={() => {
                      const filtered = getFilteredData("members", members);
                      generatePDF("members", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF Report
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("members", members);
                      generateExcel("members", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel Report
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredData("members", members).length === 0 && selectedChurchFilter === "" && isAdmin ? (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Please select a church to view its members</p>
                  </div>
                ) : (
                  getFilteredData("members", members).map(member => (
                    <div key={member.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{member.fullName}</p>
                      <p className="text-xs text-slate-500">{member.phone || "No phone"}</p>
                      {member.createdAt && <p className="text-[9px] text-slate-400 italic">Added: {formatDate(member.createdAt)}</p>}
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        member.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      )}>
                        {member.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Member Details"
                        onClick={() => setSelectedMember(member)}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Member"
                        onClick={() => setMemberForm({
                          id: member.id,
                          fullName: member.fullName,
                          email: member.email || "",
                          phone: member.phone || "",
                          address: member.address || "",
                          status: member.status,
                          churchId: member.churchId
                        })}
                      >
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        title="Delete Member"
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "ministers" && (
          <div className="space-y-8">
            <ChurchFilter feature="ministers" />
            <form onSubmit={handleAddMinister} className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                {ministerForm.id ? "Edit Minister" : "Add Minister"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Minister Name"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={ministerForm.name}
                  onChange={e => setMinisterForm({ ...ministerForm, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Role (e.g. Pastor, Elder)"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={ministerForm.role}
                  onChange={e => setMinisterForm({ ...ministerForm, role: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Contact Info"
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 md:col-span-2"
                  value={ministerForm.contact}
                  onChange={e => setMinisterForm({ ...ministerForm, contact: e.target.value })}
                />
                {(isAdmin || !profile?.churchId) && (
                  <select
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={ministerForm.churchId}
                    onChange={e => setMinisterForm({ ...ministerForm, churchId: e.target.value })}
                    required
                  >
                    <option value="">Select Church</option>
                    {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : ministerForm.id ? "Update Minister" : "Add Minister"}
                </button>
                {ministerForm.id && (
                  <button type="button" onClick={() => setMinisterForm({ id: "", name: "", role: "", contact: "", churchId: "" })} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Church Ministers</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("ministers", ministers);
                      generateCSV("ministers", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <Database size={16} /> CSV
                  </button>
                   <button 
                    onClick={() => {
                      const filtered = getFilteredData("ministers", ministers);
                      generatePDF("ministers", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("ministers", ministers);
                      generateExcel("ministers", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredData("ministers", ministers).length === 0 && selectedChurchFilter === "" && isAdmin ? (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Please select a church to view its ministers</p>
                  </div>
                ) : (
                  getFilteredData("ministers", ministers).map(min => (
                    <div key={min.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{min.name}</p>
                      <p className="text-xs text-slate-500">{min.role}</p>
                      {min.createdAt && <p className="text-[9px] text-slate-400 italic">Added: {formatDate(min.createdAt)}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setMinisterForm(min)} 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Minister"
                      >
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMinister(min.id)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Minister"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="space-y-8">
            <ChurchFilter feature="services" />
            <form onSubmit={handleAddService} className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                {serviceForm.id ? "Edit Service" : "Add Service"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Service Name"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={serviceForm.name}
                  onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Schedule (e.g. Sat 9:00 AM)"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={serviceForm.schedule}
                  onChange={e => setServiceForm({ ...serviceForm, schedule: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Description"
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 md:col-span-2"
                  value={serviceForm.description}
                  onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                />
                {(isAdmin || !profile?.churchId) && (
                  <select
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={serviceForm.churchId}
                    onChange={e => setServiceForm({ ...serviceForm, churchId: e.target.value })}
                    required
                  >
                    <option value="">Select Church</option>
                    {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : serviceForm.id ? "Update Service" : "Add Service"}
                </button>
                {serviceForm.id && (
                  <button type="button" onClick={() => setServiceForm({ id: "", name: "", schedule: "", description: "", churchId: "" })} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Church Services</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("services", services);
                      generateCSV("services", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <Database size={16} /> CSV
                  </button>
                   <button 
                    onClick={() => {
                      const filtered = getFilteredData("services", services);
                      generatePDF("services", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("services", services);
                      generateExcel("services", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredData("services", services).length === 0 && selectedChurchFilter === "" && isAdmin ? (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Bell size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Please select a church to view its services</p>
                  </div>
                ) : (
                  getFilteredData("services", services).map(service => (
                    <div key={service.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{service.name}</p>
                      <p className="text-xs text-slate-500">{service.schedule}</p>
                      {service.createdAt && <p className="text-[9px] text-slate-400 italic">Added: {formatDate(service.createdAt)}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setServiceForm(service)} 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Service"
                      >
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteService(service.id)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Service"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="space-y-8">
            <ChurchFilter feature="announcements" />
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                {announcementForm.id ? "Edit News" : "Add News"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Title"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={announcementForm.title}
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Image URL (Optional)"
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={announcementForm.imageUrl}
                  onChange={e => setAnnouncementForm({ ...announcementForm, imageUrl: e.target.value })}
                />
                <textarea
                  placeholder="Description"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 md:col-span-2 h-32"
                  value={announcementForm.description}
                  onChange={e => setAnnouncementForm({ ...announcementForm, description: e.target.value })}
                />
                <select
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={announcementForm.category}
                  onChange={e => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
                >
                  <option value="News">News</option>
                  <option value="Announcement">Announcement</option>
                  <option value="Event">Event</option>
                  <option value="Sermon">Sermon</option>
                </select>
                {(isAdmin || !profile?.churchId) && (
                  <select
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={announcementForm.churchId}
                    onChange={e => setAnnouncementForm({ ...announcementForm, churchId: e.target.value })}
                    required
                  >
                    <option value="">Select Church</option>
                    {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : announcementForm.id ? "Update News" : "Add News"}
                </button>
                {announcementForm.id && (
                  <button type="button" onClick={() => setAnnouncementForm({ id: "", title: "", description: "", date: "", imageUrl: "", churchId: "", category: "News" })} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Church News</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("announcements", announcements);
                      generateCSV("announcements", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <Database size={16} /> CSV
                  </button>
                   <button 
                    onClick={() => {
                      const filtered = getFilteredData("announcements", announcements);
                      generatePDF("announcements", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("announcements", announcements);
                      generateExcel("announcements", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredData("announcements", announcements).length === 0 && selectedChurchFilter === "" && isAdmin ? (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Bell size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Please select a church to view its news</p>
                  </div>
                ) : (
                  getFilteredData("announcements", announcements).map(ann => (
                    <div key={ann.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{ann.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{ann.description}</p>
                      <p className="text-[9px] text-slate-400 italic">Date: {formatDate(ann.date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setAnnouncementForm(ann)} 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit News"
                      >
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteAnnouncement(ann.id)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete News"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "livestreams" && (
          <div className="space-y-8">
            <ChurchFilter feature="livestreams" />
            <form onSubmit={handleAddLivestream} className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                {livestreamForm.id ? "Edit Livestream" : "Add Livestream"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="YouTube/Stream URL"
                  required
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={livestreamForm.url}
                  onChange={e => setLivestreamForm({ ...livestreamForm, url: e.target.value })}
                />
                <select
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={livestreamForm.status}
                  onChange={e => setLivestreamForm({ ...livestreamForm, status: e.target.value as any })}
                >
                  <option value="Offline">Offline</option>
                  <option value="Live">Live</option>
                </select>
                {(isAdmin || !profile?.churchId) && (
                  <select
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={livestreamForm.churchId}
                    onChange={e => setLivestreamForm({ ...livestreamForm, churchId: e.target.value })}
                    required
                  >
                    <option value="">Select Church</option>
                    {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : livestreamForm.id ? "Update Livestream" : "Add Livestream"}
                </button>
                {livestreamForm.id && (
                  <button type="button" onClick={() => setLivestreamForm({ id: "", url: "", status: "Offline", churchId: "" })} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Live Streams</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("livestreams", livestreams);
                      generateCSV("livestreams", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <Database size={16} /> CSV
                  </button>
                   <button 
                    onClick={() => {
                      const filtered = getFilteredData("livestreams", livestreams);
                      generatePDF("livestreams", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("livestreams", livestreams);
                      generateExcel("livestreams", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredData("livestreams", livestreams).length === 0 && selectedChurchFilter === "" && isAdmin ? (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Tv size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Please select a church to view its live streams</p>
                  </div>
                ) : (
                  getFilteredData("livestreams", livestreams).map(ls => (
                    <div key={ls.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800 truncate max-w-[150px]">{ls.url}</p>
                      {ls.createdAt && <p className="text-[9px] text-slate-400 italic">Added: {formatDate(ls.createdAt)}</p>}
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        ls.status === "Live" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"
                      )}>
                        {ls.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setLivestreamForm(ls)} 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Live"
                      >
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteLivestream(ls.id)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Live"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && isAdmin && (
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-slate-800">App Settings</h3>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">System Maintenance</p>
                  <p className="text-xs text-slate-500">Enable maintenance mode for all users</p>
                </div>
                <button 
                  onClick={() => toggleSetting('maintenanceMode')}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-all",
                    appSettings.maintenanceMode ? "bg-red-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    appSettings.maintenanceMode ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">Public Signups</p>
                  <p className="text-xs text-slate-500">Allow new users to create accounts</p>
                </div>
                <button 
                  onClick={() => toggleSetting('publicSignups')}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-all",
                    appSettings.publicSignups ? "bg-emerald-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    appSettings.publicSignups ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-800">Bulk Update Church Images</p>
                  <p className="text-xs text-slate-500">Set all church profile images to SDA logo</p>
                </div>
                <button 
                  onClick={async () => {
                    if (!window.confirm("Are you sure you want to update all church profile images to the SDA logo?")) return;
                    setLoading(true);
                    try {
                      const logoUrl = "https://share.google/f0PDGt0WkAdZpbbRK";
                      for (const church of churches) {
                        await api.updateChurch(church.id, { images: [logoUrl] });
                      }
                      toast.success("All church images updated successfully!");
                      // Refresh churches list
                      const updatedChurches = await api.getChurches();
                      setChurches(updatedChurches);
                    } catch (error: any) {
                      toast.error("Failed to update images: " + error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Update All"}
                </button>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-800">Database Seeding</p>
                  <p className="text-xs text-slate-500">Populate the database with initial church data</p>
                </div>
                <button 
                  onClick={handleSeedData}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Seed Churches"}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "accounts" && (
          <div className="space-y-8">
            {/* Dashboard Summary Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
                <p className="text-slate-500 text-sm font-medium">Total Offerings</p>
                <h4 className="text-2xl font-bold text-slate-800">
                  {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(totalOfferings)}
                </h4>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center">
                  <List size={24} />
                </div>
                <p className="text-slate-500 text-sm font-medium">Categories</p>
                <h4 className="text-2xl font-bold text-slate-800">
                  {offeringCategories.filter(cat => !selectedChurchFilter || cat.churchId === selectedChurchFilter).length}
                </h4>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-2">
                <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
                <p className="text-slate-500 text-sm font-medium">Avg. Offering</p>
                <h4 className="text-2xl font-bold text-slate-800">
                  {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(filteredOfferings.length > 0 ? totalOfferings / filteredOfferings.length : 0)}
                </h4>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-2">
                <div className="w-12 h-12 bg-orange-50 text-orange-700 rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <p className="text-slate-500 text-sm font-medium">Contributors</p>
                <h4 className="text-2xl font-bold text-slate-800">
                  {new Set(filteredOfferings.map(o => o.memberId)).size}
                </h4>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-600" />
                  Offering Trends (Monthly)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                  <PieChartIcon size={20} className="text-emerald-600" />
                  Offerings by Category
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={offeringsByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {offeringsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {offeringsByCategory.slice(0, 4).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs text-slate-600 truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Offering Categories Management */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <List size={20} className="text-emerald-600" />
                  Manage Offering Categories
                </h3>
                <form onSubmit={handleAddOfferingCategory} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Category Name (e.g. Tithe, Building Fund)"
                    required
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={offeringCategoryForm.name}
                    onChange={e => setOfferingCategoryForm({ ...offeringCategoryForm, name: e.target.value })}
                  />
                  {(isAdmin || !profile?.churchId) && (
                    <select
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      value={offeringCategoryForm.churchId}
                      onChange={e => setOfferingCategoryForm({ ...offeringCategoryForm, churchId: e.target.value })}
                      required
                    >
                      <option value="">Select Church</option>
                      {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  </button>
                </form>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {offeringCategories
                    .filter(cat => !selectedChurchFilter || cat.churchId === selectedChurchFilter)
                    .map(cat => (
                    <div key={cat.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{cat.name}</p>
                        {isAdmin && <p className="text-[10px] text-slate-400">{churches.find(c => c.id === cat.churchId)?.name}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setOfferingCategoryForm(cat)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <Database size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            if(window.confirm("Delete category?")) {
                              await api.deleteEntity("offering_categories", cat.id);
                              setOfferingCategories(offeringCategories.filter(c => c.id !== cat.id));
                              toast.success("Category deleted");
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Offerings List */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <DollarSign size={20} className="text-emerald-600" />
                  Recent Offerings
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {offerings
                    .filter(off => !selectedChurchFilter || off.churchId === selectedChurchFilter)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(off => (
                    <div key={off.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">
                          {members.find(m => m.id === off.memberId)?.fullName || "Unknown Member"}
                        </p>
                        <p className="text-xs text-emerald-600 font-bold">
                          {offeringCategories.find(c => c.id === off.categoryId)?.name || "General"}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatDate(off.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 text-lg">
                          {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(off.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {offerings.length === 0 && (
                    <p className="text-center py-12 text-slate-400 italic">No offerings registered yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Member Details & Offering Registration Modal */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-800 p-8 text-white relative">
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
                    <Users size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold">{selectedMember.fullName}</h3>
                    <p className="text-emerald-100 opacity-80 flex items-center gap-2 mt-1">
                      <MapPin size={14} /> {selectedMember.address || "No address provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="font-bold text-slate-800">{selectedMember.phone || "N/A"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Email Address</p>
                    <p className="font-bold text-slate-800">{selectedMember.email || "N/A"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Membership Status</p>
                    <span className={cn(
                      "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mt-1",
                      selectedMember.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {selectedMember.status}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Registered On</p>
                    <p className="font-bold text-slate-800">{formatDate(selectedMember.createdAt)}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign size={20} className="text-emerald-600" />
                    Register New Offering
                  </h4>
                  <form onSubmit={handleAddOffering} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                        <select
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                          value={offeringForm.categoryId}
                          onChange={e => setOfferingForm({ ...offeringForm, categoryId: e.target.value, memberId: selectedMember.id, churchId: selectedMember.churchId })}
                        >
                          <option value="">Select Category</option>
                          {offeringCategories
                            .filter(cat => cat.churchId === selectedMember.churchId)
                            .map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Amount (TZS)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                          value={offeringForm.amount}
                          onChange={e => setOfferingForm({ ...offeringForm, amount: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                      <input
                        type="date"
                        required
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        value={offeringForm.date}
                        onChange={e => setOfferingForm({ ...offeringForm, date: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : "Register Offering"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
