import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Tv, Play, Loader2, MapPin, Radio } from "lucide-react";
import ReactPlayer from "react-player";
const Player = ReactPlayer as any;
import { cn } from "../lib/utils";

interface Livestream {
  id: string;
  churchId: string;
  url: string;
  status: "Live" | "Offline";
  churchName?: string;
}

export default function Live() {
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStream, setActiveStream] = useState<Livestream | null>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const q = query(collection(db, "livestreams"));
        const snap = await getDocs(q);
        const data = await Promise.all(snap.docs.map(async (d) => {
          const stream = { id: d.id, ...d.data() } as Livestream;
          const churchSnap = await getDoc(doc(db, "churches", stream.churchId));
          return {
            ...stream,
            churchName: churchSnap.exists() ? churchSnap.data().name : "Unknown Church"
          };
        }));
        setStreams(data);
        if (data.length > 0) setActiveStream(data[0]);
      } catch (error) {
        console.error("Error fetching streams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Watch Live</h2>
          <p className="text-emerald-100 text-sm opacity-80">Sabbath services and more</p>
        </div>
        <Tv size={80} className="absolute -right-4 -bottom-4 text-emerald-700/30 rotate-12" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-sm">Loading streams...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeStream && (
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video relative">
              <Player
                url={activeStream.url}
                width="100%"
                height="100%"
                controls
                playing
              />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1",
                  activeStream.status === "Live" ? "bg-red-600 text-white animate-pulse" : "bg-slate-700 text-slate-300"
                )}>
                  <Radio size={12} />
                  {activeStream.status === "Live" ? "LIVE" : "OFFLINE"}
                </div>
                <div className="bg-black/50 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
                  <MapPin size={12} />
                  {activeStream.churchName}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Play size={20} className="text-emerald-600" />
              Available Streams
            </h3>

            {streams.length > 0 ? (
              <div className="grid gap-3">
                {streams.map(stream => (
                  <button
                    key={stream.id}
                    onClick={() => setActiveStream(stream)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                      activeStream?.id === stream.id
                        ? "bg-emerald-50 border-emerald-200 shadow-sm"
                        : "bg-white border-slate-100 hover:border-emerald-200"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                      stream.status === "Live" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
                    )}>
                      <Tv size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{stream.churchName}</h4>
                      <p className="text-slate-500 text-xs truncate">{stream.url}</p>
                    </div>
                    {stream.status === "Live" && (
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <p>No live streams available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
