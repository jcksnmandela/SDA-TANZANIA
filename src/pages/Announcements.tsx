import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Bell, Calendar, MapPin, Loader2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface Announcement {
  id: string;
  churchId: string;
  title: string;
  description: string;
  date: string;
  imageUrl?: string;
  churchName?: string;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const q = query(collection(db, "announcements"), orderBy("date", "desc"));
        const snap = await getDocs(q);
        const data = await Promise.all(snap.docs.map(async (d) => {
          const announcement = { id: d.id, ...d.data() } as Announcement;
          const churchSnap = await getDoc(doc(db, "churches", announcement.churchId));
          return {
            ...announcement,
            churchName: churchSnap.exists() ? churchSnap.data().name : "Unknown Church"
          };
        }));
        setAnnouncements(data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Church News</h2>
          <p className="text-emerald-100 text-sm opacity-80">Latest updates from SDA Tanzania</p>
        </div>
        <Bell size={80} className="absolute -right-4 -bottom-4 text-emerald-700/30 rotate-12" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-sm">Loading announcements...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.length > 0 ? announcements.map(announcement => (
            <div
              key={announcement.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all"
            >
              {announcement.imageUrl && (
                <img
                  src={announcement.imageUrl}
                  alt={announcement.title}
                  className="w-full h-48 object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">
                    {announcement.churchName}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                    <Calendar size={12} />
                    {format(new Date(announcement.date), "MMM d, yyyy")}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">
                  {announcement.title}
                </h3>
                <div className="text-slate-600 text-sm line-clamp-3 prose prose-sm prose-emerald">
                  <ReactMarkdown>{announcement.description}</ReactMarkdown>
                </div>
                <Link
                  to={`/church/${announcement.churchId}`}
                  className="flex items-center justify-between pt-3 border-t border-slate-50 text-emerald-700 text-xs font-bold group"
                >
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    Visit Church
                  </div>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <p>No announcements found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
