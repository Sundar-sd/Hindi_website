import React, { useState, useEffect } from "react";
import { 
  Calculator, 
  UserCircle, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Hash,
  TrendingUp,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  ChevronDown,
  Loader2,
  History,
  Printer,
  Share2
} from "lucide-react";
import axios from "axios";
import { apiService } from "../../lib/api";
import { useEngineerData } from "../../hooks/useEngineerData";
import ActiveWorkforceSummary from "./ActiveWorkforceSummary";

// API Base for proxied requests
const API_BASE = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
  : '/api-manpower';

import { generateProfessionalPDF, shareToWhatsApp } from "../../lib/pdfReportGenerator";

const AdvanceTab: React.FC = () => {
  const { refreshData } = useEngineerData();
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [billRecords, setBillRecords] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("All");

  // Extract unique site locations dynamically from the bill records
  const uniqueSites = Array.from(
    new Set(
      (billRecords || [])
        .map((a: any) => a.site_location || a.siteName)
        .filter(Boolean)
    )
  );

  // Filter bill records based on selected site
  const filteredBillRecords = selectedSite === "All"
    ? (billRecords || [])
    : (billRecords || []).filter(
        (a: any) => (a.site_location || a.siteName) === selectedSite
      );

  const [formData, setFormData] = useState({
    idNo: "",
    category: "",
    name: "",
    siteName: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    status: "Pending" as "Settled" | "Pending"
  });

  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = async (id: any) => {
    if (!window.confirm("Permanently delete this bill record from the cloud?")) return;
    try {
      await apiService.deleteBillRecord(id);
      alert("Record successfully deleted!");
      await fetchAllData();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete record.");
    }
  };

  const handlePrintSingle = (record: any) => {
    const name = record.name || record.labour_name || "-";
    const site = record.site_location || record.siteName || "-";
    const amount = record.amount || 0;
    const date = record.date ? new Date(record.date).toLocaleDateString("en-GB") : 'N/A';
    const role = record.category || "General";
    const id = record.labour_id || "N/A";

    const doc = generateProfessionalPDF({
      title: "Labour Advance Voucher",
      engineer: "Administrative Branch",
      site: site,
      period: `Dated: ${date}`,
      tableHead: [["Labour Name", "Role", "Labour ID", "Date", "Amount", "Status"]],
      tableBody: [[
        name,
        role,
        id,
        date,
        `₹${amount.toLocaleString()}`,
        record.status || "Pending"
      ]],
      filename: `Advance_${name}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppSingle = async (record: any) => {
    const name = record.name || record.labour_name || "-";
    const site = record.site_location || record.siteName || "-";
    const amount = record.amount || 0;
    const summary = `*Advance Paid - ${name}*\n*Site:* ${site}\n*Amount:* ₹${amount.toLocaleString()}\n*Status:* ${record.status}`;
    
    // Using simple version for WhatsApp
    const date = record.date ? new Date(record.date).toLocaleDateString("en-GB") : 'N/A';
    const doc = generateProfessionalPDF({
      title: "Labour Advance Voucher",
      engineer: "Administrative Branch",
      site: site,
      tableHead: [["Labour Name", "Amount", "Status", "Date"]],
      tableBody: [[name, `₹${amount.toLocaleString()}`, record.status, date]]
    });
    await shareToWhatsApp(doc, `Advance_${name}`, summary);
  };

  const handlePrintOverallHistory = () => {
    if (filteredBillRecords.length === 0) return alert("No advance records to print.");

    const tableBody = filteredBillRecords.slice().reverse().map((a: any, idx: number) => {
      const displayName = a.name || a.labour_name || "-";
      const site = a.site_location || a.siteName || "-";
      const date = a.date ? new Date(a.date).toLocaleDateString("en-GB") : 'N/A';

      return [
        idx + 1,
        displayName,
        a.category || "-",
        site,
        date,
        `₹${(a.amount || 0).toLocaleString()}`,
        a.status || "Pending"
      ];
    });

    const grandTotal = filteredBillRecords.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Advance Records" : `Advance Records - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Labour Name", "Role", "Site", "Date", "Amount", "Status"]],
      tableBody,
      tableFooter: ["TOTALS", "", "", "", "", `₹${grandTotal.toLocaleString()}`, ""],
      filename: selectedSite === "All" ? "Advance_Records_Report" : `Advance_Records_${selectedSite}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppOverallHistory = async () => {
    if (filteredBillRecords.length === 0) return alert("No advance records to share.");

    const tableBody = filteredBillRecords.slice().reverse().map((a: any, idx: number) => {
      const displayName = a.name || a.labour_name || "-";
      const site = a.site_location || a.siteName || "-";
      const date = a.date ? new Date(a.date).toLocaleDateString("en-GB") : 'N/A';

      return [
        idx + 1,
        displayName,
        a.category || "-",
        site,
        date,
        `₹${(a.amount || 0).toLocaleString()}`,
        a.status || "Pending"
      ];
    });

    const grandTotal = filteredBillRecords.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Advance Records" : `Advance Records - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Labour Name", "Role", "Site", "Date", "Amount", "Status"]],
      tableBody,
      tableFooter: ["TOTALS", "", "", "", "", `₹${grandTotal.toLocaleString()}`, ""],
      filename: selectedSite === "All" ? "Advance_Records_Report" : `Advance_Records_${selectedSite}`
    });

    const summaryText = `*Advance Records Report*\n` +
      `*Site:* ${selectedSite === "All" ? "All Sites" : selectedSite}\n` +
      `*Total Records:* ${filteredBillRecords.length}\n` +
      `*Total Estimated Amount:* ₹${grandTotal.toLocaleString()}\n` +
      `*Date:* ${new Date().toLocaleDateString("en-GB")}`;

    await shareToWhatsApp(doc, selectedSite === "All" ? "Advance_Records_Report" : `Advance_Records_${selectedSite}`, summaryText);
  };

  // Fetch data on mount
  const fetchAllData = async () => {
    try {
      setIsFetchingAssignments(true);
      setIsFetchingHistory(true);
      
      const [assignmentsRes, billRecordsRes] = await Promise.all([
        axios.get(`${API_BASE}/workforce-assignments/`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        apiService.getBillRecords()
      ]);
      
      setAssignments(assignmentsRes.data);
      setBillRecords(billRecordsRes);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsFetchingAssignments(false);
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-fill logic when Labour ID is entered
  useEffect(() => {
    if (formData.idNo && assignments.length > 0) {
      const match = assignments.find(a => String(a.labour_id).toLowerCase() === formData.idNo.toLowerCase());
      if (match) {
        setFormData(prev => ({
          ...prev,
          name: match.labour_name || "",
          category: match.labour_type || "",
          siteName: match.site_location || ""
        }));
      }
    }
  }, [formData.idNo, assignments]);

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.siteName) {
      return alert("Please fill in Name, Site, and Amount");
    }

    try {
      setIsAdding(true);
      
      const payload = {
        labour_id: formData.idNo,
        name: formData.name, // Use 'name' as required by backend
        category: formData.category,
        site_location: formData.siteName,
        date: formData.date,
        amount: Number(formData.amount),
        status: formData.status
      };

      await apiService.createBillRecord(payload);
      
      setFormData(prev => ({
        ...prev,
        idNo: "",
        category: "",
        name: "",
        amount: "",
        status: "Pending"
      }));
      
      await fetchAllData();
      alert("Bill record added successfully and synced to database");
    } catch (err) {
      console.error(err);
      alert("Error adding bill record");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-10 pb-20">
      <ActiveWorkforceSummary />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            Bill Details
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Track worker advances and settlement bills</p>
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
            onClick={handlePrintOverallHistory}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Overall
          </button>

          {/* Share Overall to WhatsApp */}
          <button
            onClick={handleWhatsAppOverallHistory}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Share Overall
          </button>

          {/* Total Value Block */}
          <div className="bg-indigo-50 dark:bg-indigo-500/10 px-6 py-2.5 rounded-2xl flex items-center gap-4 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Total Value</p>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹ {(filteredBillRecords || []).reduce((sum, a) => sum + (a.amount || 0), 0).toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex items-center gap-3 mb-10 relative z-10">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Add New Bill Record</h3>
        </div>

        <form onSubmit={handleAddBill} className="relative z-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* ID No - Trigger */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 ml-1">
                <Hash className="w-3.5 h-3.5" /> Labour ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner outline-none"
                  value={formData.idNo}
                  onChange={e => setFormData(prev => ({ ...prev, idNo: e.target.value }))}
                  placeholder="Labour ID (e.g. 001)"
                />
                {isFetchingAssignments && <Loader2 className="w-4 h-4 absolute right-4 top-4 animate-spin text-indigo-500" />}
              </div>
            </div>

            {/* Labour Category */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <Briefcase className="w-3.5 h-3.5" /> Category
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Role"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <UserCircle className="w-3.5 h-3.5" /> Name
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full Name"
              />
            </div>

            {/* Site */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <MapPin className="w-3.5 h-3.5" /> Site Location
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                value={formData.siteName}
                onChange={e => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                placeholder="Site"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <Calendar className="w-3.5 h-3.5" /> Date
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner cursor-pointer"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <TrendingUp className="w-3.5 h-3.5" /> Amount (₹)
              </label>
              <input
                type="number"
                className="w-full bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3.5 text-sm font-black text-emerald-600 dark:text-emerald-400 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Present State */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <Clock className="w-3.5 h-3.5" /> Present State
              </label>
              <div className="relative group">
                <select
                  className={`w-full border-none rounded-xl p-4 text-sm font-black transition-all shadow-inner appearance-none cursor-pointer ${formData.status === 'Settled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as "Settled" | "Pending" }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="Settled">Settled</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isAdding}
              className="group relative bg-indigo-600 disabled:bg-indigo-400 hover:bg-indigo-500 text-white px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 flex items-center gap-4 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className={`w-4 h-4 ${isAdding ? 'animate-spin' : 'group-hover:rotate-90'} transition-transform`} />
              {isAdding ? "Adding Record..." : "Create Bill Record"}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-slide-up">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
            <History className="w-4 h-4 text-indigo-500" /> Permanent Bill Records {selectedSite !== "All" ? `- ${selectedSite}` : ""}
          </h3>
          <button onClick={fetchAllData} className="p-2 hover:bg-indigo-50 rounded-lg transition-all">
            <Loader2 className={`w-4 h-4 text-indigo-400 ${isFetchingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Labour Detail</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(filteredBillRecords || []).slice().reverse().map((a, idx) => {
                const displayName = a.name || a.labour_name || "-";
                return (
                  <tr key={a.id || idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-black text-xs">
                          {String(displayName).charAt(0) || "L"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{displayName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{a.labour_id || 'No ID'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {a.category}
                      </span>
                    </td>
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> {a.site_location || 'Unknown'}
                      </p>
                    </td>
                    <td className="p-6">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-tighter italic">
                        {a.date ? new Date(a.date).toLocaleDateString("en-GB") : 'N/A'}
                      </p>
                    </td>
                    <td className="p-6 text-right">
                      <p className="font-black text-slate-800 dark:text-white text-sm">₹{(a.amount || 0).toLocaleString()}</p>
                    </td>
                    <td className="p-6 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${a.status === 'Settled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {a.status === 'Settled' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {a.status}
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handlePrintSingle(a)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors" title="Print Single"><Printer className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleWhatsAppSingle(a)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="WhatsApp Single"><Share2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Delete Record"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(filteredBillRecords || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <History className="w-10 h-10 text-slate-200" />
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">No bill records found in database</p>
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

export default AdvanceTab;
