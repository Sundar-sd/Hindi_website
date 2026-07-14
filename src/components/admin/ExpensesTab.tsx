import React, { useState, useEffect } from "react";
import { 
  Calculator, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Trash2, 
  Plus, 
  Printer, 
  Share2, 
  ChevronDown,
  Tag,
  Wallet,
  Receipt,
  Loader2
} from "lucide-react";
import { generateProfessionalPDF, shareToWhatsApp } from "../../lib/pdfReportGenerator";

import { apiService } from "../../lib/api";
import ActiveWorkforceSummary from "./ActiveWorkforceSummary";

const EXPENSE_CATEGORIES = [
  "Petrol",
  "Food",
  "Tea/Refreshment",
  "Utensils",
  "Vehicle Maintenance",
  "Salary to Staff",
  "Salary to Labours",
  "Commission/Additional Expenses",
  "Other Expenses"
];

const ExpensesTab: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("All");
  const [dataLoading, setDataLoading] = useState(true);

  const [formData, setFormData] = useState({
    category: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    siteId: ""
  });

  const [isAdding, setIsAdding] = useState(false);

  // Dynamic Unique Sites Extractor from current expenses and assignments
  const uniqueSites = Array.from(
    new Set(
      (expenses || [])
        .map((e: any) => {
          const siteObj = sites.find(s => s.id === e.site || s.id === e.assignment);
          return e.site_location || e.location || (siteObj ? (siteObj.name || siteObj.site_location) : null);
        })
        .filter(Boolean)
    )
  );

  // Dynamic filtered expenses list
  const filteredExpenses = selectedSite === "All"
    ? (expenses || [])
    : (expenses || []).filter((e: any) => {
        const siteObj = sites.find(s => s.id === e.site || s.id === e.assignment);
        const siteName = e.site_location || e.location || (siteObj ? (siteObj.name || siteObj.site_location) : "General");
        return siteName === selectedSite;
      });

  // Load from backend on mount
  // Load from backend on mount
  const fetchExpenses = async () => {
    try {
      setDataLoading(true);
      const [expenseData, assignmentData] = await Promise.all([
        apiService.getExpenses(),
        apiService.getWorkforceAssignments()
      ]);
      
      const assignments = assignmentData || [];

      // Create a unique list based on site location from assignments
      const mergedSitesMap = new Map();
      
      assignments.forEach((a: any) => {
        const siteName = (a.site_location || a.site_details?.site_location || a.site_details?.name || "General").trim();
        const nameLower = siteName.toLowerCase();
        
        if (siteName && !mergedSitesMap.has(nameLower)) {
          mergedSitesMap.set(nameLower, { 
            id: a.id, 
            site_location: siteName 
          });
        }
      });

      setExpenses(expenseData);
      setSites(Array.from(mergedSitesMap.values()));
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const typedLocation = formData.siteId;

    if (!formData.category || !formData.amount || !typedLocation) {
      return alert("Please fill in Category, Amount, and Site Location");
    }

    try {
      setIsAdding(true);
      
      // 1. RE-FETCH ASSIGNMENTS TO FIND THE ID
      const allAssignments = await apiService.getWorkforceAssignments();
      const normalize = (s: string) => (s || "").trim().toLowerCase();
      
      // Find an assignment that matches the typed location
      const match = allAssignments.find((a: any) => 
        normalize(a.site_location || a.site_details?.site_location || "") === normalize(typedLocation)
      );

      if (!match) {
        setIsAdding(false);
        return alert(`Error: No workforce assignment found for "${typedLocation}". \n\nPlease ensure this location exists in your Workforce Database first.`);
      }

      // 2. PREPARE THE PAYLOAD (Use exact backend field names)
      const payload = {
        date: formData.date, // Backend wants 'date'
        expense_type: formData.category,
        amount: Number(formData.amount),
        site_location: typedLocation,
        assignment: match.id // Backend wants 'assignment' (PK)
      };

      await apiService.createExpense(payload);
      await fetchExpenses();
      
      setFormData(prev => ({ ...prev, category: "", amount: "", siteId: "" }));
      alert("Expense successfully stored in Cloud!");
    } catch (err: any) {
      console.error(err);
      alert("Error: Cloud rejected the record. Please check if the location is registered.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Permanently delete this record from the cloud?")) return;
    try {
      await apiService.deleteExpense(id);
      alert("Record deleted successfully!");
      await fetchExpenses();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete record from cloud.");
    }
  };

  const handlePrintSingle = (e: any) => {
    const date = e.expense_date || e.date;
    const type = e.expense_type || e.category;
    const siteObj = sites.find(s => s.id === e.site || s.id === e.assignment);
    const siteName = e.site_location || e.location || (siteObj ? (siteObj.name || siteObj.site_location) : "General");
    const amount = e.amount || 0;

    const doc = generateProfessionalPDF({
      title: "Project Expense Voucher",
      engineer: "Administrative Branch",
      site: siteName,
      period: `Dated: ${new Date(date).toLocaleDateString("en-GB")}`,
      tableHead: [["Date", "Category", "Location", "Amount"]],
      tableBody: [[
        new Date(date).toLocaleDateString("en-GB"),
        type,
        siteName,
        `₹${amount.toLocaleString()}`
      ]],
      filename: `Expense_${type}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppSingle = async (e: any) => {
    const type = e.expense_type || e.category;
    const siteObj = sites.find(s => s.id === e.site || s.id === e.assignment);
    const siteName = e.site_location || e.location || (siteObj ? (siteObj.name || siteObj.site_location) : "General");
    const amount = e.amount || 0;
    const summary = `*Project Expense - ${type}*\n*Site:* ${siteName}\n*Amount:* ₹${amount.toLocaleString()}`;
    
    const doc = generateProfessionalPDF({
      title: "Project Expense Voucher",
      engineer: "Administrative Branch",
      site: siteName,
      tableHead: [["Category", "Amount", "Location"]],
      tableBody: [[type, `₹${amount.toLocaleString()}`, siteName]]
    });
    await shareToWhatsApp(doc, `Expense_${type}`, summary);
  };

  const generateReportData = () => {
    const tableBody = filteredExpenses.map((e, idx) => {
      const date = e.expense_date || e.date;
      const type = e.expense_type || e.category;
      const siteObj = sites.find(s => s.id === e.site || s.id === e.assignment);
      const siteName = e.site_location || e.location || (siteObj ? (siteObj.name || siteObj.site_location) : "General");
      const amount = e.amount || 0;

      return [
        idx + 1,
        date ? new Date(date).toLocaleDateString("en-GB") : "N/A",
        type,
        siteName,
        `₹${amount.toLocaleString()}`
      ];
    });

    const grandTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      title: selectedSite === "All" ? "Overall Project Expenses" : `Project Expenses - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Date", "Category", "Location", "Amount"]],
      tableBody,
      tableFooter: ["TOTALS", "", "", "", `₹${grandTotal.toLocaleString()}`],
      filename: selectedSite === "All" ? "Overall_Expenses_Report" : `Expenses_${selectedSite}`
    };
  };

  const handlePrint = () => {
    const data = generateReportData();
    if (data.tableBody.length === 0) return alert("No records to print.");
    const doc = generateProfessionalPDF(data);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsApp = async () => {
    const data = generateReportData();
    if (data.tableBody.length === 0) return alert("No records to share.");
    const doc = generateProfessionalPDF(data);
    const grandTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const summary = `*Project Expense Report*\n` +
      `*Site:* ${selectedSite === "All" ? "All Sites" : selectedSite}\n` +
      `*Total Expenditure:* ₹${grandTotal.toLocaleString()}\n` +
      `*Date:* ${new Date().toLocaleDateString("en-GB")}`;
    await shareToWhatsApp(doc, selectedSite === "All" ? "Overall_Expenses_Report" : `Expenses_${selectedSite}`, summary);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-10 pb-20">
      <ActiveWorkforceSummary />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-rose-600 rounded-xl shadow-lg shadow-rose-600/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            Bill Details
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Project and Operational Expense Tracking (Offline Mode)</p>
        </div>
        
        {/* Top Control Bar with Site Filter and Print Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Location Selector */}
          <div className="relative group">
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-200 hover:text-indigo-600 transition-all cursor-pointer shadow-sm pr-10 appearance-none min-w-[160px]"
            >
              <option value="All">All Site Locations</option>
              {uniqueSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
          </div>

          {/* Print Overall Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Overall
          </button>

          {/* Share Overall to WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Share Overall
          </button>
        </div>
      </div>

      {/* Horizontal Entry Form */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
        <form onSubmit={handleAddExpense} className="flex flex-col lg:flex-row items-end gap-6">
          {/* Expenses Dropdown */}
          <div className="flex-1 w-full space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <Receipt className="w-3.5 h-3.5 text-rose-500" /> Expenses
            </label>
            <div className="relative group">
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500/20 transition-all shadow-inner appearance-none cursor-pointer"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select Category</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
            </div>
          </div>

          {/* Date */}
          <div className="w-full lg:w-48 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <Calendar className="w-3.5 h-3.5 text-rose-500" /> Date
            </label>
            <input
              type="date"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500/20 transition-all shadow-inner cursor-pointer"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {/* Amount */}
          <div className="w-full lg:w-48 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <Wallet className="w-3.5 h-3.5 text-rose-500" /> Amount (₹)
            </label>
            <input
              type="number"
              className="w-full bg-white dark:bg-slate-800 border-2 border-rose-100 dark:border-rose-900/30 rounded-xl p-3.5 text-sm font-black text-rose-600 dark:text-rose-400 focus:ring-4 focus:ring-rose-500/5 outline-none transition-all"
              value={formData.amount}
              onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          {/* Site Input (Changed from Select to Text) */}
          <div className="flex-1 w-full space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Site
            </label>
            <input
              type="text"
              required
              placeholder="Enter Site Location (e.g. Erode)"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500/20 transition-all shadow-inner outline-none"
              value={formData.siteId}
              onChange={e => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
            />
          </div>

          {/* Add Button */}
          <button
            type="submit"
            disabled={isAdding}
            className="shrink-0 bg-rose-600 disabled:bg-rose-400 text-white h-14 w-14 lg:w-14 rounded-2xl flex items-center justify-center hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20 active:scale-95 group"
          >
            <Plus className={`w-6 h-6 ${isAdding ? 'animate-spin' : 'group-hover:rotate-90'} transition-transform`} />
          </button>
        </form>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Expenditure</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Record Count</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{filteredExpenses.length} Entries</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-slide-up relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-indigo-500 to-emerald-500" />
        
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white flex items-center gap-3">
              <Receipt className="w-4 h-4 text-rose-500" /> Expense Records {selectedSite !== "All" ? `- ${selectedSite}` : ""}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">Stored cloud expenditures and site context</p>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense Category</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.slice().reverse().map((e, idx) => {
                const date = e.expense_date || e.date;
                const type = e.expense_type || e.category;
                
                // Smart site name lookup (checks siteObj first, then direct cloud fields)
                const siteObj = sites.find(s => s.id === e.site || s.id === e.assignment);
                const siteName = e.site_location || e.location || (siteObj ? (siteObj.name || siteObj.site_location) : "General");
                
                const amount = e.amount || 0;

                return (
                  <tr key={e.id!} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="p-6 text-[10px] font-black text-slate-400">{String(filteredExpenses.length - idx).padStart(2, "0")}</td>
                    <td className="p-6 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {date ? new Date(date).toLocaleDateString("en-GB") : "N/A"}
                    </td>
                    <td className="p-6">
                      <span className="inline-flex bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-500/20">
                        {type}
                      </span>
                    </td>
                    <td className="p-6 text-sm font-bold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {siteName}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <p className="font-black text-slate-900 dark:text-white">₹{amount.toLocaleString()}</p>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handlePrintSingle(e)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors" title="Print Single"><Printer className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleWhatsAppSingle(e)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="WhatsApp Single"><Share2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Delete Record"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Receipt className="w-10 h-10 text-slate-200" />
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">No expense records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpensesTab;
