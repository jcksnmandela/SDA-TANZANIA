import { useState, useEffect } from "react";
import { Shield, Plus, DollarSign, List, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { toast } from "sonner";

export default function Treasurer() {
  const { churchId } = useParams();
  const [offerings, setOfferings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!churchId) return;
      try {
        const [offeringData, categoryData] = await Promise.all([
          api.getEntities("offerings", churchId),
          api.getEntities("offering_categories", churchId)
        ]);
        setOfferings(offeringData);
        setCategories(categoryData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [churchId]);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg">
        <h2 className="text-2xl font-bold">Treasurer Dashboard</h2>
        <p className="text-emerald-100 text-sm">Manage offerings and categories</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign size={20} /> Register Offering</h3>
            {/* Offering form will go here */}
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><List size={20} /> Manage Categories</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get("name") as string;
              if (!name || !churchId) return;
              try {
                await api.addEntity("offering_categories", { name, churchId });
                toast.success("Category added");
                setCategories([...categories, { name, churchId }]);
                e.currentTarget.reset();
              } catch (error) {
                toast.error("Failed to add category");
              }
            }} className="flex gap-2">
              <input name="name" placeholder="Category Name" className="flex-1 p-2 border rounded-xl" required />
              <button type="submit" className="p-2 bg-emerald-600 text-white rounded-xl"><Plus size={20} /></button>
            </form>
            <div className="mt-4 space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="p-2 bg-slate-50 rounded-lg text-sm">{cat.name}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
