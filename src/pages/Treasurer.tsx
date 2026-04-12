import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Church as ChurchIcon, Users, Loader2, Database, Search, 
  FileText, FileSpreadsheet, Eye, DollarSign, List, TrendingUp, 
  PieChart as PieChartIcon, ArrowLeft, MapPin
} from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { cn, formatDate } from "../lib/utils";
import { useDownloads } from "../contexts/DownloadContext";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

const COLORS = ['#059669', '#0284c7', '#7c3aed', '#ea580c', '#db2777', '#ca8a04'];

export default function Treasurer() {
  const { churchId } = useParams();
  const navigate = useNavigate();
  const { profile, isTreasurer, isAdmin, isChurchAdmin, loading: authLoading } = useAuth();
  const { addDownload } = useDownloads();

  const [churches, setChurches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [offeringCategories, setOfferingCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showOfferingModal, setShowOfferingModal] = useState(false);
  const [showOfferingCategoryModal, setShowOfferingCategoryModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpenseCategoryModal, setShowExpenseCategoryModal] = useState(false);

  const [offeringCategoryForm, setOfferingCategoryForm] = useState({
    id: "", name: "", churchId: churchId || ""
  });

  const [expenseCategoryForm, setExpenseCategoryForm] = useState({
    id: "", name: "", churchId: churchId || ""
  });

  const [offeringForm, setOfferingForm] = useState({
    id: "", memberId: "", categoryId: "", amount: "", date: new Date().toISOString().split('T')[0], churchId: churchId || ""
  });

  const [expenseForm, setExpenseForm] = useState({
    id: "", categoryId: "", amount: "", description: "", date: new Date().toISOString().split('T')[0], churchId: churchId || ""
  });

  useEffect(() => {
    if (!authLoading && !isAdmin && !isChurchAdmin && (!isTreasurer || profile?.churchId !== churchId)) {
      toast.error("Unauthorized access");
      navigate("/");
    }
  }, [authLoading, profile, churchId, isAdmin, isChurchAdmin, isTreasurer, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!churchId) return;
      setLoading(true);
      try {
        const [churchData, memberData, offeringData, categoryData, expenseData, expCatData] = await Promise.all([
          api.getChurches(),
          api.getEntities("members", churchId),
          api.getEntities("offerings", churchId),
          api.getEntities("offering_categories", churchId),
          api.getEntities("expenses", churchId),
          api.getEntities("expense_categories", churchId)
        ]);
        setChurches(churchData);
        setMembers(memberData);
        setOfferings(offeringData);
        setOfferingCategories(categoryData);
        setExpenses(expenseData);
        setExpenseCategories(expCatData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [churchId]);

  const currentChurch = churches.find(c => c.id === churchId);

  // Dashboard Calculations
  const totalOfferings = offerings.reduce((sum, off) => sum + Number(off.amount), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const balance = totalOfferings - totalExpenses;
  
  const chartData = offerings.reduce((acc: any[], off) => {
    const month = new Date(off.date).toLocaleString('default', { month: 'short' });
    const existing = acc.find(d => d.name === month);
    if (existing) {
      existing.amount += Number(off.amount);
    } else {
      acc.push({ name: month, amount: Number(off.amount) });
    }
    return acc;
  }, []).sort((a, b) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(a.name) - months.indexOf(b.name);
  });

  const offeringsByCategory = offeringCategories.map(cat => ({
    name: cat.name,
    value: offerings.filter(o => o.categoryId === cat.id).reduce((sum, o) => sum + Number(o.amount), 0)
  })).filter(c => c.value > 0);

  const handleAddOfferingCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offeringCategoryForm.name || !churchId) return;
    setLoading(true);
    try {
      if (offeringCategoryForm.id) {
        await api.updateEntity("offering_categories", offeringCategoryForm.id, { name: offeringCategoryForm.name });
        setOfferingCategories(offeringCategories.map(c => c.id === offeringCategoryForm.id ? { ...c, name: offeringCategoryForm.name } : c));
        toast.success("Category updated");
      } else {
        const newCat = await api.addEntity("offering_categories", { name: offeringCategoryForm.name, churchId });
        setOfferingCategories([...offeringCategories, { ...newCat, name: offeringCategoryForm.name, churchId }]);
        toast.success("Category added");
      }
      setOfferingCategoryForm({ id: "", name: "", churchId: churchId });
    } catch (error) {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpenseCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseCategoryForm.name || !churchId) return;
    setLoading(true);
    try {
      if (expenseCategoryForm.id) {
        await api.updateEntity("expense_categories", expenseCategoryForm.id, { name: expenseCategoryForm.name });
        setExpenseCategories(expenseCategories.map(c => c.id === expenseCategoryForm.id ? { ...c, name: expenseCategoryForm.name } : c));
        toast.success("Expense category updated");
      } else {
        const newCat = await api.addEntity("expense_categories", { name: expenseCategoryForm.name, churchId });
        setExpenseCategories([...expenseCategories, { ...newCat, name: expenseCategoryForm.name, churchId }]);
        toast.success("Expense category added");
      }
      setExpenseCategoryForm({ id: "", name: "", churchId: churchId });
    } catch (error) {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offeringForm.memberId || !offeringForm.categoryId || !offeringForm.amount || !churchId) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const newOffering = await api.addEntity("offerings", {
        ...offeringForm,
        amount: Number(offeringForm.amount),
        churchId
      });
      setOfferings([...offerings, { ...newOffering, ...offeringForm, amount: Number(offeringForm.amount), churchId }]);
      toast.success("Offering registered successfully");
      setOfferingForm({ id: "", memberId: "", categoryId: "", amount: "", date: new Date().toISOString().split('T')[0], churchId: churchId });
      setSelectedMember(null);
      setShowOfferingModal(false);
    } catch (error) {
      toast.error("Failed to register offering");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.categoryId || !expenseForm.amount || !churchId) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const newExpense = await api.addEntity("expenses", {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        churchId
      });
      setExpenses([...expenses, { ...newExpense, ...expenseForm, amount: Number(expenseForm.amount), churchId }]);
      toast.success("Expense registered successfully");
      setExpenseForm({ id: "", categoryId: "", amount: "", description: "", date: new Date().toISOString().split('T')[0], churchId: churchId });
      setShowExpenseModal(false);
    } catch (error) {
      toast.error("Failed to register expense");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (title: string, data: any[]) => {
    const doc = new jsPDF();
    doc.text(`${currentChurch?.name || 'Church'} - ${title}`, 14, 15);
    autoTable(doc, {
      head: [Object.keys(data[0] || {})],
      body: data.map(item => Object.values(item)),
      startY: 20,
    });
    const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_report.pdf`;
    doc.save(fileName);
    addDownload({ name: fileName, type: 'pdf', url: '#' });
  };

  const generateExcel = (title: string, data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_report.xlsx`;
    XLSX.writeFile(wb, fileName);
    addDownload({ name: fileName, type: 'xlsx', url: '#' });
  };

  if (authLoading || loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-700" /></div>;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold">Church Accounts Dashboard</h2>
              <p className="text-emerald-100 text-sm opacity-80">
                Managing finances for {currentChurch?.name || "Church"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowOfferingModal(true)}
              className="flex-1 md:flex-none bg-white text-emerald-800 px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-lg"
            >
              <Plus size={16} /> Add Offerings
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex-1 md:flex-none bg-red-500 text-white px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-lg"
            >
              <Plus size={16} /> Add Expenses
            </button>
            <button
              onClick={() => setShowOfferingCategoryModal(true)}
              className="flex-1 md:flex-none bg-emerald-600 text-white px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold"
            >
              <List size={16} /> Offering Categories
            </button>
            <button
              onClick={() => setShowExpenseCategoryModal(true)}
              className="flex-1 md:flex-none bg-orange-600 text-white px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold"
            >
              <List size={16} /> Expense Categories
            </button>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => generatePDF("Financial Report", offerings)}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
          >
            <FileText size={16} /> PDF Report
          </button>
          <button
            onClick={() => generateExcel("Offerings", offerings)}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
          >
            <FileSpreadsheet size={16} /> Excel Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
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
          <div className="w-12 h-12 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center">
            <TrendingUp className="rotate-180" size={24} />
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Expenses</p>
          <h4 className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(totalExpenses)}
          </h4>
        </div>
        <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-2">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center">
            <Database size={24} />
          </div>
          <p className="text-slate-500 text-sm font-medium">Net Balance</p>
          <h4 className={cn("text-2xl font-bold", balance >= 0 ? "text-emerald-700" : "text-red-700")}>
            {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(balance)}
          </h4>
        </div>
        <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-2">
          <div className="w-12 h-12 bg-orange-50 text-orange-700 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <p className="text-slate-500 text-sm font-medium">Contributors</p>
          <h4 className="text-2xl font-bold text-slate-800">
            {new Set(offerings.map(o => o.memberId)).size}
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

      {/* Management Sections - Hidden by default, accessed via modals */}
      
      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Offerings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            Recent Offerings
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {offerings
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map(off => (
              <div key={off.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">
                    {members.find(m => m.id === off.memberId)?.fullName || "Unknown"}
                  </p>
                  <p className="text-xs text-emerald-600 font-bold">
                    {offeringCategories.find(c => c.id === off.categoryId)?.name || "General"}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDate(off.date)}</p>
                </div>
                <p className="font-bold text-slate-800 text-lg">
                  {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(off.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-red-600 rotate-180" />
            Recent Expenses
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {expenses
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map(exp => (
              <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">
                    {expenseCategories.find(c => c.id === exp.categoryId)?.name || "General"}
                  </p>
                  <p className="text-xs text-slate-500">{exp.description}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(exp.date)}</p>
                </div>
                <p className="font-bold text-red-600 text-lg">
                  {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(exp.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Offering Registration Modal (Search Flow) */}
      {showOfferingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-emerald-800 p-8 text-white relative shrink-0">
              <button 
                onClick={() => {
                  setShowOfferingModal(false);
                  setSelectedMember(null);
                  setSearchTerm("");
                }}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              >
                <Plus className="rotate-45" size={24} />
              </button>
              <h3 className="text-2xl font-bold">Register Offering</h3>
              <p className="text-emerald-100 opacity-80">Search for a member to record their contribution</p>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              {!selectedMember ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search member by name..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  {searchTerm.length > 0 && (
                    <div className="space-y-2">
                      {members
                        .filter(m => m.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(member => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedMember(member)}
                          className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                        >
                          <div className="text-left">
                            <p className="font-bold text-slate-800 group-hover:text-emerald-800">{member.fullName}</p>
                            <p className="text-xs text-slate-500">{member.phone || "No phone"}</p>
                          </div>
                          <Plus size={20} className="text-slate-300 group-hover:text-emerald-600" />
                        </button>
                      ))}
                      {members.filter(m => m.fullName.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                        <p className="text-center py-8 text-slate-400 italic">No members found matching "{searchTerm}"</p>
                      )}
                    </div>
                  )}
                  {searchTerm.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Users size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Start typing to search for members</p>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAddOffering} className="space-y-6">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Selected Member</p>
                      <p className="font-bold text-slate-800 text-lg">{selectedMember.fullName}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Change Member
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                      <select
                        required
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        value={offeringForm.categoryId}
                        onChange={e => setOfferingForm({ ...offeringForm, categoryId: e.target.value, memberId: selectedMember.id })}
                      >
                        <option value="">Select Category</option>
                        {offeringCategories.map(cat => (
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
                    className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2"
                  >
                    Register Offering
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offering Categories Modal */}
      {showOfferingCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
            <div className="bg-emerald-800 p-8 text-white relative shrink-0">
              <button 
                onClick={() => setShowOfferingCategoryModal(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              >
                <Plus className="rotate-45" size={24} />
              </button>
              <h3 className="text-2xl font-bold">Offering Categories</h3>
              <p className="text-emerald-100 opacity-80">Manage contribution types</p>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <form onSubmit={handleAddOfferingCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Category Name"
                  required
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={offeringCategoryForm.name}
                  onChange={e => setOfferingCategoryForm({ ...offeringCategoryForm, name: e.target.value })}
                />
                <button
                  type="submit"
                  className="px-4 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-all"
                >
                  <Plus size={20} />
                </button>
              </form>
              <div className="space-y-2">
                {offeringCategories.map(cat => (
                  <div key={cat.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <p className="font-bold text-slate-800">{cat.name}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setOfferingCategoryForm(cat)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
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
          </div>
        </div>
      )}

      {/* Expense Registration Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-red-800 p-8 text-white relative">
              <button 
                onClick={() => setShowExpenseModal(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              >
                <Plus className="rotate-45" size={24} />
              </button>
              <h3 className="text-2xl font-bold">Register Expense</h3>
              <p className="text-red-100 opacity-80">Record a new church expenditure</p>
            </div>
            <form onSubmit={handleAddExpense} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                <select
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  value={expenseForm.categoryId}
                  onChange={e => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {expenseCategories.map(cat => (
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
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                <input
                  type="text"
                  placeholder="What was this for?"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-700/20 hover:bg-red-800 transition-all flex items-center justify-center gap-2"
              >
                Register Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Categories Modal */}
      {showExpenseCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
            <div className="bg-orange-800 p-8 text-white relative shrink-0">
              <button 
                onClick={() => setShowExpenseCategoryModal(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              >
                <Plus className="rotate-45" size={24} />
              </button>
              <h3 className="text-2xl font-bold">Expense Categories</h3>
              <p className="text-orange-100 opacity-80">Manage expenditure types</p>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <form onSubmit={handleAddExpenseCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Category Name"
                  required
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  value={expenseCategoryForm.name}
                  onChange={e => setExpenseCategoryForm({ ...expenseCategoryForm, name: e.target.value })}
                />
                <button
                  type="submit"
                  className="px-4 bg-orange-700 text-white rounded-xl font-bold hover:bg-orange-800 transition-all"
                >
                  <Plus size={20} />
                </button>
              </form>
              <div className="space-y-2">
                {expenseCategories.map(cat => (
                  <div key={cat.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <p className="font-bold text-slate-800">{cat.name}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setExpenseCategoryForm(cat)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg">
                        <Database size={16} />
                      </button>
                      <button 
                        onClick={async () => {
                          if(window.confirm("Delete category?")) {
                            await api.deleteEntity("expense_categories", cat.id);
                            setExpenseCategories(expenseCategories.filter(c => c.id !== cat.id));
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
          </div>
        </div>
      )}
    </div>
  );
}
