import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, setDoc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import firebaseConfig from "../../firebase-applet-config.json";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Church as ChurchIcon, Users, Bell, Tv, MapPin, Image as ImageIcon, Loader2, Database, Lock, Search, FileText, FileSpreadsheet, Printer, ChevronDown, Eye } from "lucide-react";
import { cn, formatDate } from "../lib/utils";
import { initialChurches } from "../data/initialChurches";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { Link } from "react-router-dom";

export default function Admin() {
  const { profile, isAdmin, isChurchAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"churches" | "users" | "members" | "services" | "ministers" | "announcements" | "livestreams" | "settings">("churches");
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [featureFilter, setFeatureFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>("");
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
    id: "", title: "", description: "", date: "", imageUrl: "", churchId: ""
  });

  const [livestreamForm, setLivestreamForm] = useState({
    id: "", url: "", status: "Offline" as any, churchId: ""
  });

  const [appSettings, setAppSettings] = useState({ maintenanceMode: false, publicSignups: true });

  useEffect(() => {
    if (!isAdmin) return;
    const path = "config/global";
    const unsub = onSnapshot(doc(db, "config", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsub();
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
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) {
          matchesDate = false;
        } else {
          const itemDate = d.toISOString().split('T')[0];
          if (dateRange.start && itemDate < dateRange.start) matchesDate = false;
          if (dateRange.end && itemDate > dateRange.end) matchesDate = false;
        }
      }

      if (isAdmin) {
        if (feature === 'users') {
          if (selectedChurchFilter === "") {
            return matchesSearch && matchesDate && item.role === 'admin';
          }
          return matchesSearch && matchesDate && item.churchId === selectedChurchFilter;
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
      await updateDoc(doc(db, "config", "global"), { [key]: newVal });
      toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "config/global");
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

  useEffect(() => {
    if (!authLoading && !isAdmin && !isChurchAdmin) {
      navigate("/");
      toast.error("Access denied. Authorized personnel only.");
    }
  }, [isAdmin, isChurchAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || (!isAdmin && !isChurchAdmin)) return;

      try {
        // Fetch Churches
        let churchesQuery = query(collection(db, "churches"));
        if (!isAdmin && isChurchAdmin && profile?.churchId) {
          // Only fetch the specific church for church admins
          const churchDoc = await getDoc(doc(db, "churches", profile.churchId));
          if (churchDoc.exists()) {
            setChurches([{ id: churchDoc.id, name: churchDoc.data().name, ...churchDoc.data() }]);
          } else {
            setChurches([]);
          }
        } else {
          const churchesSnap = await getDocs(churchesQuery);
          const churchesList = churchesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name, ...doc.data() }));
          setChurches(churchesList);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "churches");
      }

      try {
        // Fetch Users
        let usersQuery = query(collection(db, "users"));
        if (!isAdmin && isChurchAdmin && profile?.churchId) {
          usersQuery = query(collection(db, "users"), where("churchId", "==", profile.churchId));
        }
        const usersSnap = await getDocs(usersQuery);
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "users");
      }

      try {
        // Fetch Members
        let membersQuery = query(collection(db, "members"));
        if (!isAdmin && isChurchAdmin && profile?.churchId) {
          membersQuery = query(collection(db, "members"), where("churchId", "==", profile.churchId));
        }
        const membersSnap = await getDocs(membersQuery);
        setMembers(membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "members");
      }

      try {
        // Fetch Services
        let servicesQuery = query(collection(db, "services"));
        if (!isAdmin && isChurchAdmin && profile?.churchId) {
          servicesQuery = query(collection(db, "services"), where("churchId", "==", profile.churchId));
        }
        const servicesSnap = await getDocs(servicesQuery);
        setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "services");
      }

      try {
        // Fetch Ministers
        let ministersQuery = query(collection(db, "ministers"));
        if (!isAdmin && isChurchAdmin && profile?.churchId) {
          ministersQuery = query(collection(db, "ministers"), where("churchId", "==", profile.churchId));
        }
        const ministersSnap = await getDocs(ministersQuery);
        setMinisters(ministersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "ministers");
      }

      try {
        // Fetch Announcements
        let announcementsQuery = query(collection(db, "announcements"));
        if (!isAdmin && isChurchAdmin && profile?.churchId) {
          announcementsQuery = query(collection(db, "announcements"), where("churchId", "==", profile.churchId));
        }
        const announcementsSnap = await getDocs(announcementsQuery);
        setAnnouncements(announcementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "announcements");
      }

      try {
        // Fetch Livestreams
        let livestreamsQuery = query(collection(db, "livestreams"));
        if (!isAdmin && isChurchAdmin && profile?.churchId) {
          livestreamsQuery = query(collection(db, "livestreams"), where("churchId", "==", profile.churchId));
        }
        const livestreamsSnap = await getDocs(livestreamsQuery);
        setLivestreams(livestreamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "livestreams");
      }
    };
    fetchData();
  }, [isAdmin, isChurchAdmin, authLoading, profile?.churchId]);

  const regions = [
    "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar North", "Zanzibar South and Central", "Zanzibar West"
  ];

  const handleAddChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isAdmin && !churchForm.id) {
        toast.error("Church Admins cannot create new churches. Please contact a Super Admin.");
        setLoading(false);
        return;
      }

      let imageUrl = "";
      if (churchForm.image) {
        const storageRef = ref(storage, `churches/${Date.now()}_${churchForm.image.name}`);
        await uploadBytes(storageRef, churchForm.image);
        imageUrl = await getDownloadURL(storageRef);
      }

      const churchData = {
        name: churchForm.name,
        region: churchForm.region,
        district: churchForm.district,
        address: churchForm.address,
        location: { lat: parseFloat(churchForm.lat), lng: parseFloat(churchForm.lng) },
        contact: churchForm.contact,
        images: imageUrl ? [imageUrl] : [],
      };

      if (churchForm.id) {
        // Update
        await setDoc(doc(db, "churches", churchForm.id), churchData, { merge: true });
        toast.success("Church updated successfully!");
      } else {
        // Add
        await addDoc(collection(db, "churches"), churchData);
        toast.success("Church added successfully!");
      }
      
      setChurchForm({ id: "", name: "", region: "", district: "", address: "", lat: "", lng: "", contact: "", image: null });
    } catch (error: any) {
      toast.error(error.message);
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
          churchId: userForm.churchId || (isChurchAdmin ? profile?.churchId : ""),
        };
        await setDoc(doc(db, "users", userForm.id), updateData, { merge: true });
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
          
          // 2. Create Firestore profile
          const userData = {
            uid,
            fullName: userForm.fullName,
            email: email,
            role: userForm.role,
            churchId: userForm.churchId || (isChurchAdmin ? profile?.churchId : ""),
            favorites: [],
            mustChangePassword: true,
          };
          
          await setDoc(doc(db, "users", uid), userData);
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
              churchId: userForm.churchId || (isChurchAdmin ? profile?.churchId : ""),
              favorites: [],
              mustChangePassword: true,
              createdAt: new Date().toISOString(),
            };
            const docRef = await addDoc(collection(db, "users"), userData);
            setUsers([{ id: docRef.id, ...userData }, ...users]);
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

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm("Force this user to change their password on next login?")) return;
    try {
      await setDoc(doc(db, "users", userId), { mustChangePassword: true }, { merge: true });
      toast.success("User will be prompted to change password on next login.");
      setUsers(users.map(u => u.id === userId ? { ...u, mustChangePassword: true } : u));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
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
        await setDoc(doc(db, "members", memberForm.id), memberData, { merge: true });
        toast.success("Member updated successfully!");
        setMembers(members.map(m => m.id === memberForm.id ? { ...m, ...memberData } : m));
      } else {
        const docRef = await addDoc(collection(db, "members"), memberData);
        setMembers([{ id: docRef.id, ...memberData }, ...members]);
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
        await setDoc(doc(db, "services", id), rest, { merge: true });
        setServices(services.map(s => s.id === id ? { ...s, ...rest } : s));
        toast.success("Service updated");
      } else {
        const docRef = await addDoc(collection(db, "services"), rest);
        setServices([{ id: docRef.id, ...rest }, ...services]);
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
        await setDoc(doc(db, "ministers", id), rest, { merge: true });
        setMinisters(ministers.map(m => m.id === id ? { ...m, ...rest } : m));
        toast.success("Minister updated");
      } else {
        const docRef = await addDoc(collection(db, "ministers"), rest);
        setMinisters([{ id: docRef.id, ...rest }, ...ministers]);
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
        await setDoc(doc(db, "announcements", id), rest, { merge: true });
        setAnnouncements(announcements.map(a => a.id === id ? { ...a, ...rest } : a));
        toast.success("Announcement updated");
      } else {
        const docRef = await addDoc(collection(db, "announcements"), rest);
        setAnnouncements([{ id: docRef.id, ...rest }, ...announcements]);
        toast.success("Announcement added");
      }
      setAnnouncementForm({ id: "", title: "", description: "", date: "", imageUrl: "", churchId: "" });
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
        await setDoc(doc(db, "livestreams", id), rest, { merge: true });
        setLivestreams(livestreams.map(l => l.id === id ? { ...l, ...rest } : l));
        toast.success("Livestream updated");
      } else {
        const docRef = await addDoc(collection(db, "livestreams"), rest);
        setLivestreams([{ id: docRef.id, ...rest }, ...livestreams]);
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
      await deleteDoc(doc(db, "members", id));
      setMembers(members.filter(m => m.id !== id));
      toast.success("Member deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Delete service?")) return;
    try {
      await deleteDoc(doc(db, "services", id));
      setServices(services.filter(s => s.id !== id));
      toast.success("Service deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteMinister = async (id: string) => {
    if (!window.confirm("Delete minister?")) return;
    try {
      await deleteDoc(doc(db, "ministers", id));
      setMinisters(ministers.filter(m => m.id !== id));
      toast.success("Minister deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Delete announcement?")) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
      setAnnouncements(announcements.filter(a => a.id !== id));
      toast.success("Announcement deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteLivestream = async (id: string) => {
    if (!window.confirm("Delete livestream?")) return;
    try {
      await deleteDoc(doc(db, "livestreams", id));
      setLivestreams(livestreams.filter(l => l.id !== id));
      toast.success("Livestream deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSeedData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const churchesCol = collection(db, "churches");
      const existingSnap = await getDocs(churchesCol);
      const existingNames = new Set(existingSnap.docs.map(doc => doc.data().name));

      let addedCount = 0;
      for (const church of initialChurches) {
        if (!existingNames.has(church.name)) {
          await addDoc(churchesCol, church);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`Successfully added ${addedCount} churches!`);
      } else {
        toast.info("All initial churches already exist in the database.");
      }

      // Seed Settings
      await setDoc(doc(db, "config", "global"), {
        maintenanceMode: false,
        publicSignups: true
      });
      toast.success("System settings initialized!");
    } catch (error: any) {
      toast.error("Failed to seed data: " + error.message);
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
      case "members": return ["Name", "Phone", "Status", "Date Added"];
      case "users": return ["Name", "Email", "Role", "Date Added"];
      case "ministers": return ["Name", "Role", "Contact", "Date Added"];
      case "services": return ["Name", "Schedule", "Description", "Date Added"];
      case "announcements": return ["Title", "Date", "Category", "Date Added"];
      case "livestreams": return ["URL", "Status", "Date Added"];
      case "churches": return ["Name", "Region", "District", "Address"];
      default: return [];
    }
  };

  const getTableCells = (feature: string, item: any) => {
    switch (feature) {
      case "members": return [item.fullName, item.phone || "N/A", item.status, formatDate(item.createdAt)];
      case "users": return [item.fullName, item.email, item.role.replace('_', ' '), formatDate(item.createdAt)];
      case "ministers": return [item.name, item.role, item.contact || "N/A", formatDate(item.createdAt)];
      case "services": return [item.name, item.schedule, item.description || "N/A", formatDate(item.createdAt)];
      case "announcements": return [item.title, formatDate(item.date), item.category || "News", formatDate(item.createdAt)];
      case "livestreams": return [item.url, item.status, formatDate(item.createdAt)];
      case "churches": return [item.name, item.region, item.district, item.address];
      default: return [];
    }
  };

  const handleEdit = (feature: string, item: any) => {
    setActiveTab(feature as any);
    switch (feature) {
      case "members": setMemberForm(item); break;
      case "users": setUserForm(item); break;
      case "ministers": setMinisterForm(item); break;
      case "services": setServiceForm(item); break;
      case "announcements": setAnnouncementForm(item); break;
      case "livestreams": setLivestreamForm(item); break;
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
    const headers = getTableHeaders(feature).join(",");
    const rows = data.map(item => getTableCells(feature, item).join(",")).join("\n");
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${feature}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report generated successfully");
  };

  const generatePDF = (feature: string, data: any[]) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();
    const churchName = churches.find(c => c.id === selectedChurchId)?.name || "Church";
    
    doc.setFontSize(18);
    doc.text(`${churchName} - ${feature.toUpperCase()} REPORT`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const headers = [getTableHeaders(feature)];
    const rows = data.map(item => getTableCells(feature, item));

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }, // emerald-600
    });

    doc.save(`${feature}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF report generated successfully");
  };

  const generateExcel = (feature: string, data: any[]) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = getTableHeaders(feature);
    const rows = data.map(item => getTableCells(feature, item));
    
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, feature);
    
    XLSX.writeFile(workbook, `${feature}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel report generated successfully");
  };

  const generateFullReport = () => {
    if (!isAdmin) return;
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105);
    doc.text("SDA TANZANIA - FULL SYSTEM REPORT", 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPos);
    yPos += 15;

    const s = searchTerm.toLowerCase();
    const sections = [
      { 
        title: "CHURCHES", 
        data: churches.filter(c => c.name.toLowerCase().includes(s) || (c as any).region.toLowerCase().includes(s) || (c as any).district.toLowerCase().includes(s)), 
        headers: ["Name", "Region", "District", "Address"], 
        cells: (item: any) => [item.name, item.region, item.district, item.address] 
      },
      { 
        title: "USERS", 
        data: users.filter(u => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s)), 
        headers: ["Name", "Email", "Role"], 
        cells: (item: any) => [item.fullName, item.email, item.role.replace('_', ' ')] 
      },
      { 
        title: "MEMBERS", 
        data: members.filter(m => m.fullName.toLowerCase().includes(s) || (m.email && m.email.toLowerCase().includes(s)) || (m.phone && m.phone.toLowerCase().includes(s))), 
        headers: ["Name", "Phone", "Status", "Church"], 
        cells: (item: any) => [item.fullName, item.phone || "N/A", item.status, churches.find(c => c.id === item.churchId)?.name || "N/A"] 
      },
      { 
        title: "MINISTERS", 
        data: ministers.filter(m => m.name.toLowerCase().includes(s) || m.role.toLowerCase().includes(s)), 
        headers: ["Name", "Role", "Church"], 
        cells: (item: any) => [item.name, item.role, churches.find(c => c.id === item.churchId)?.name || "N/A"] 
      },
      { 
        title: "SERVICES", 
        data: services.filter(s_item => s_item.name.toLowerCase().includes(s) || s_item.schedule.toLowerCase().includes(s)), 
        headers: ["Name", "Schedule", "Church"], 
        cells: (item: any) => [item.name, item.schedule, churches.find(c => c.id === item.churchId)?.name || "N/A"] 
      },
      { 
        title: "NEWS/ANNOUNCEMENTS", 
        data: announcements.filter(a => a.title.toLowerCase().includes(s) || a.description.toLowerCase().includes(s)), 
        headers: ["Title", "Date", "Church"], 
        cells: (item: any) => [item.title, formatDate(item.date), churches.find(c => c.id === item.churchId)?.name || "N/A"] 
      },
      { 
        title: "LIVESTREAMS", 
        data: livestreams.filter(ls => ls.url.toLowerCase().includes(s) || ls.status.toLowerCase().includes(s)), 
        headers: ["URL", "Status", "Church"], 
        cells: (item: any) => [item.url, item.status, churches.find(c => c.id === item.churchId)?.name || "N/A"] 
      },
    ];

    sections.forEach((section, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(section.title, 14, yPos);
      yPos += 5;

      autoTable(doc, {
        head: [section.headers],
        body: section.data.map(section.cells),
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        margin: { top: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`full_system_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Full system report generated successfully");
  };

  if (authLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold">{isAdmin ? "Super Admin Panel" : "Church Admin Panel"}</h2>
          <p className="text-emerald-100 text-sm opacity-80">
            {isAdmin ? "Full system management" : `Managing ${churches.find(c => c.id === profile?.churchId)?.name || "Church"}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isChurchAdmin && (
            <button
              onClick={() => setSelectedChurchId(profile?.churchId || null)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
            >
              <ChurchIcon size={16} /> Church Dashboard
            </button>
          )}
          {isAdmin && (
            <button
              onClick={generateFullReport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-lg shadow-emerald-900/20"
            >
              <FileText size={16} /> Full System Report
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleSeedData}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Database size={16} /> Seed Data
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar no-print snap-x">
        {[
          { id: "churches", icon: ChurchIcon, label: "Churches" },
          { id: "users", icon: Users, label: "Users" },
          { id: "members", icon: Users, label: "Members" },
          { id: "ministers", icon: Users, label: "Ministers" },
          { id: "services", icon: Bell, label: "Services" },
          { id: "announcements", icon: Bell, label: "News" },
          { id: "livestreams", icon: Tv, label: "Live" },
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

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { id: 'users', label: 'Users', icon: Users, count: users.filter(u => u.churchId === selectedChurchId).length },
                    { id: 'members', label: 'Members', icon: Users, count: members.filter(m => m.churchId === selectedChurchId).length },
                    { id: 'ministers', label: 'Ministers', icon: ChurchIcon, count: ministers.filter(m => m.churchId === selectedChurchId).length },
                    { id: 'services', label: 'Services', icon: Bell, count: services.filter(s => s.churchId === selectedChurchId).length },
                    { id: 'announcements', label: 'News', icon: Bell, count: announcements.filter(a => a.churchId === selectedChurchId).length },
                    { id: 'livestreams', label: 'Live', icon: Tv, count: livestreams.filter(l => l.churchId === selectedChurchId).length },
                  ].map(stat => (
                    <button
                      key={stat.id}
                      onClick={() => {
                        setSelectedChurchFilter(selectedChurchId);
                        setActiveTab(stat.id as any);
                        setSelectedChurchId(null);
                      }}
                      className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-center group"
                    >
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <stat.icon size={20} />
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{stat.count}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase">{stat.label}</p>
                    </button>
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
                    onChange={e => setChurchForm({ ...churchForm, region: e.target.value })}
                  >
                    <option value="">Select Region</option>
                    {regions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="District"
                    required
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={churchForm.district}
                    onChange={e => setChurchForm({ ...churchForm, district: e.target.value })}
                  />
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
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
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
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Edit Church Info"
                      >
                        <Database size={16} />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={async () => {
                            if(window.confirm("Delete church?")) {
                              await deleteDoc(doc(db, "churches", church.id));
                              setChurches(churches.filter(c => c.id !== church.id));
                              toast.success("Church deleted");
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
                  <option value="church_end_user">Church End-user</option>
                  <option value="online_user">Online User</option>
                </select>
                {(isAdmin || userForm.role === "church_admin" || userForm.role === "church_end_user") && (
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
                      <p className="font-bold text-slate-800">{user.fullName}</p>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{user.role.replace('_', ' ')}</p>
                      {user.churchId && <p className="text-[10px] text-emerald-600">{churches.find(c => c.id === user.churchId)?.name}</p>}
                      {user.createdAt && <p className="text-[9px] text-slate-400 mt-1 italic">Added: {formatDate(user.createdAt)}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information">
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => setUserForm({
                          id: user.id,
                          fullName: user.fullName,
                          email: user.email,
                          role: user.role,
                          churchId: user.churchId || ""
                        })}
                        title="Manage Data"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      >
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={() => handleResetPassword(user.id)}
                        title="Reset Password"
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        <Lock size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete User"
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
                    <div className="flex gap-1">
                      <Link to={`/church/${member.churchId}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information">
                        <Eye size={16} />
                      </Link>
                      <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"
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
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
                      generatePDF("ministers", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF Report
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("ministers", ministers);
                      generateExcel("ministers", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel Report
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
                    <div className="flex gap-1">
                      <Link to={`/church/${min.churchId}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information">
                        <Eye size={16} />
                      </Link>
                      <button onClick={() => setMinisterForm(min)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      <button onClick={() => handleDeleteMinister(min.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
                      generatePDF("services", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF Report
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("services", services);
                      generateExcel("services", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel Report
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
                    <div className="flex gap-1">
                      <Link to={`/church/${service.churchId}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information">
                        <Eye size={16} />
                      </Link>
                      <button onClick={() => setServiceForm(service)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      <button onClick={() => handleDeleteService(service.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
                  <button type="button" onClick={() => setAnnouncementForm({ id: "", title: "", description: "", date: "", imageUrl: "", churchId: "" })} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
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
                      generatePDF("announcements", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF Report
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("announcements", announcements);
                      generateExcel("announcements", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel Report
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
                    <div className="flex gap-1">
                      <Link to={`/church/${ann.churchId}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information">
                        <Eye size={16} />
                      </Link>
                      <button onClick={() => setAnnouncementForm(ann)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
                      generatePDF("livestreams", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileText size={16} /> PDF Report
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = getFilteredData("livestreams", livestreams);
                      generateExcel("livestreams", filtered);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet size={16} /> Excel Report
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
                    <div className="flex gap-1">
                      <Link to={`/church/${ls.churchId}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Information">
                        <Eye size={16} />
                      </Link>
                      <button onClick={() => setLivestreamForm(ls)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Manage Data"><Database size={16} /></button>
                      <button onClick={() => handleDeleteLivestream(ls.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
