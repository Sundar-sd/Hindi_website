import React, { useState, useEffect } from "react";
import {
  Calculator,
  UserCircle,
  MapPin,
  Briefcase,
  Calendar,
  ChevronRight,
  PlusCircle,
  FileText,
  Send,
  Printer,
  Share2,
  TrendingUp,
  Trash2,
  Plus,
  Hash,
  Filter,
  Loader2,
  CheckCircle2,
  History,
  Download,
  ChevronDown
} from "lucide-react";
import axios from "axios";
import { apiService } from "../../lib/api";
import { generateProfessionalPDF, shareToWhatsApp } from "../../lib/pdfReportGenerator";
import ActiveWorkforceSummary from "./ActiveWorkforceSummary";

// API Base for proxied requests
const API_BASE = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
  : '/api-manpower';

interface DutyRecord {
  labourId: string;
  category: string;
  engineerName: string;
  siteName: string;
  labourName: string;
  days: number[]; // 7 days
  totalDuties: number;
  ratePerDuty: number;
  totalAmount: number;
  startDate: string; // Added to track week
  assignmentId?: number; // Backend requirement
}

const PayOutTab: React.FC = () => {
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [logHistory, setLogHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("All");

  // Extract unique site locations from the assignments and permanent history logs
  const uniqueSites = Array.from(
    new Set(
      logHistory
        .map((log: any) => {
          const details = log.assignment_details || {};
          return details.site_location || log.site_location || log.site_name || log.site;
        })
        .filter(Boolean)
    )
  );

  // Filter log history based on selected site
  const filteredLogHistory = selectedSite === "All"
    ? logHistory
    : logHistory.filter((log: any) => {
        const details = log.assignment_details || {};
        const siteName = details.site_location || log.site_location || log.site_name || log.site;
        return siteName === selectedSite;
      });

  const [weekStartDate, setWeekStartDate] = useState(() => {
    const d = new Date();
    // Default to last Sunday
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });
  const [weekEndDate, setWeekEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 6);
    return d.toISOString().split('T')[0];
  });
  const [entryStartDate, setEntryStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [formData, setFormData] = useState<DutyRecord>({
    labourId: "",
    category: "",
    engineerName: "",
    siteName: "",
    labourName: "",
    days: [0, 0, 0, 0, 0, 0, 0],
    totalDuties: 0,
    ratePerDuty: 0,
    totalAmount: 0,
    startDate: entryStartDate,
    assignmentId: undefined
  });

  const [billRecords, setBillRecords] = useState<DutyRecord[]>([]);

  // Fetch workforce assignments & log history
  const fetchData = async () => {
    try {
      setIsFetchingAssignments(true);
      setIsFetchingHistory(true);
      
      const [assignmentsRes, logs] = await Promise.all([
        axios.get(`${API_BASE}/workforce-assignments/`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        apiService.getWeeklyLogs()
      ]);
      
      setAssignments(assignmentsRes.data);
      setLogHistory(logs || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsFetchingAssignments(false);
      setIsFetchingHistory(false);
    }
  };

  const handleDeleteLog = async (id: any) => {
    if (!window.confirm("Permanently delete this weekly duty log from the cloud?")) return;
    try {
      await apiService.deleteWeeklyLog(id);
      alert("Log successfully deleted!");
      await fetchData();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete log.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill logic when Labour ID is entered
  useEffect(() => {
    if (formData.labourId && assignments.length > 0) {
      const match = assignments.find(a => String(a.labour_id).toLowerCase() === formData.labourId.toLowerCase());
      if (match) {
        setFormData(prev => ({
          ...prev,
          labourName: match.labour_name || "",
          category: match.labour_type || "",
          engineerName: match.name || "",
          siteName: match.site_location || "",
          assignmentId: match.id
        }));
      }
    }
  }, [formData.labourId, assignments]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, startDate: entryStartDate }));
  }, [entryStartDate]);

  useEffect(() => {
    if (weekStartDate) {
      const start = new Date(weekStartDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setWeekEndDate(end.toISOString().split('T')[0]);
      setEntryStartDate(weekStartDate);
    }
  }, [weekStartDate]);

  useEffect(() => {
    const totalD = formData.days.reduce((a, b) => a + b, 0);
    setFormData(prev => ({
      ...prev,
      totalDuties: totalD,
      totalAmount: totalD * prev.ratePerDuty
    }));
  }, [formData.days, formData.ratePerDuty]);

  const handleDayChange = (index: number, value: string) => {
    const val = parseFloat(value) || 0;
    const newDays = [...formData.days];
    newDays[index] = val;
    setFormData(prev => ({ ...prev, days: newDays }));
  };

  const handleAddRecord = () => {
    if (!formData.labourName || !formData.category) {
      return alert("Please enter Labour Name and Category");
    }
    setBillRecords(prev => [...prev, { ...formData }]);
    setFormData(prev => ({
      ...prev,
      labourId: "",
      labourName: "",
      category: "",
      days: [0, 0, 0, 0, 0, 0, 0],
      totalDuties: 0,
      ratePerDuty: 0,
      totalAmount: 0
    }));
  };

  const handleSaveBill = async () => {
    if (billRecords.length === 0) return alert("No records to save.");

    try {
      setIsSaving(true);
      const promises = billRecords.map(async (record) => {
        const logPayload = {
          labour_id: record.labourId,
          labour_name: record.labourName,
          category: record.category,
          engineer_name: record.engineerName,
          site_location: record.siteName,
          days_log: record.days, // Send as raw array
          total_duties: record.totalDuties,
          rate_per_duty: record.ratePerDuty,
          total_amount: record.totalAmount,
          week_starting: record.startDate, // Change field name as required by backend
          assignment: record.assignmentId // Map the ID to the required field
        };
        return apiService.createWeeklyLog(logPayload);
      });

      await Promise.all(promises);
      setBillRecords([]); // Clear table after successful save
      await fetchData(); // Refresh history
      alert("All weekly log records saved successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to save some log records.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeRecord = (index: number) => {
    setBillRecords(prev => prev.filter((_, i) => i !== index));
  };

  const getWeekLabels = (start: string) => {
    const dates = [];
    const date = new Date(start);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      dates.push({
        label: dayNames[d.getDay()],
        date: `${d.getDate()}/${d.getMonth() + 1}`
      });
    }
    return dates;
  };

  const filterWeekLabels = getWeekLabels(weekStartDate);
  const entryWeekLabels = getWeekLabels(entryStartDate);

  const generateReportData = () => {
    const tableBody = billRecords.map(record => [
      record.labourName,
      record.category,
      ...record.days,
      record.totalDuties,
      `₹${record.ratePerDuty}`,
      `₹${record.totalAmount.toLocaleString()}`
    ]);

    const grandTotal = billRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    const engineer = billRecords[0]?.engineerName || formData.engineerName || "N/A";
    const site = billRecords[0]?.siteName || formData.siteName || "N/A";

    const dayHeaders = filterWeekLabels.map(l => `${l.label} ${l.date}`);

    return {
      title: "Workforce Weekly Bill Details",
      engineer,
      site,
      period: `Period: ${weekStartDate} to ${weekEndDate}`,
      tableHead: [["Labour Name", "Role", ...dayHeaders, "Total", "Rate", "Amount"]],
      tableBody,
      tableFooter: ["GRAND TOTAL", "", "", "", "", "", "", "", "", "", "", `₹${grandTotal.toLocaleString()}`]
    };
  };

  const handlePrint = () => {
    const data = generateReportData();
    if (data.tableBody.length === 0) return alert("Please add at least one labour record first.");
    const doc = generateProfessionalPDF(data);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsApp = async () => {
    const data = generateReportData();
    if (data.tableBody.length === 0) return alert("Please add at least one labour record first.");
    const doc = generateProfessionalPDF(data);
    const grandTotal = billRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    const summary = `*Bill Details - ${data.site}*\n*Period:* ${weekStartDate} to ${weekEndDate}\n*Engineer:* ${data.engineer}\n*Grand Total: ₹${grandTotal.toLocaleString()}*`;
    await shareToWhatsApp(doc, `Bill_${data.site}`, summary);
  };

  const handlePrintSingle = (record: any) => {
    // Advanced mapping for history records
    const details = record.assignment_details || {};
    const name = details.labour_name || record.labour_name || record.labourName || "-";
    const role = details.labour_type || record.category || record.role || "-";
    const eng = details.name || record.engineer_name || record.engineerName || "-";
    const site = details.site_location || record.site_location || record.siteName || "-";
    
    const duties = record.total_duties !== undefined ? record.total_duties : (record.totalDuties || 0);
    const rate = record.rate_per_duty || record.ratePerDuty || record.rate || 0;
    const amount = record.total_amount !== undefined ? record.total_amount : (record.totalAmount || 0);
    const start = record.week_starting || record.startDate || record.date || weekStartDate;
    
    const rawDays = record.seven_day_duty_log || record.days_log || record.days || [0,0,0,0,0,0,0];
    const days = typeof rawDays === 'string' ? JSON.parse(rawDays) : rawDays;

    const dayHeaders = getWeekLabels(start).map(l => `${l.label} ${l.date}`);

    const doc = generateProfessionalPDF({
      title: "Individual Duty Record",
      engineer: eng,
      site: site,
      period: `Week Starting: ${start}`,
      tableHead: [["Labour Name", "Role", ...dayHeaders, "Total", "Rate", "Amount"]],
      tableBody: [[
        name,
        role,
        ...days,
        duties,
        `₹${rate}`,
        `₹${amount.toLocaleString()}`
      ]],
      filename: `Duty_${name}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppSingle = async (record: any) => {
    const details = record.assignment_details || {};
    const name = details.labour_name || record.labour_name || record.labourName || "-";
    const role = details.labour_type || record.category || record.role || "-";
    const site = details.site_location || record.site_location || record.siteName || "-";
    const duties = record.total_duties !== undefined ? record.total_duties : (record.totalDuties || 0);
    const rate = record.rate_per_duty || record.ratePerDuty || record.rate || 0;
    const amount = record.total_amount !== undefined ? record.total_amount : (record.totalAmount || 0);
    const start = record.week_starting || record.startDate || record.date || weekStartDate;
    const eng = details.name || record.engineer_name || record.engineerName || "-";
    
    const rawDays = record.seven_day_duty_log || record.days_log || record.days || [0,0,0,0,0,0,0];
    const days = typeof rawDays === 'string' ? JSON.parse(rawDays) : rawDays;

    const summary = `*Duty Record - ${name}*\n*Role:* ${role}\n*Site:* ${site}\n*Duties:* ${duties}\n*Rate:* ₹${rate}\n*Total:* ₹${amount.toLocaleString()}`;
    
    const dayHeaders = getWeekLabels(start).map(l => `${l.label} ${l.date}`);
    const doc = generateProfessionalPDF({
      title: "Individual Duty Record",
      engineer: eng,
      site: site,
      period: `Week Starting: ${start}`,
      tableHead: [["Labour Name", "Role", ...dayHeaders, "Total", "Rate", "Amount"]],
      tableBody: [[
        name,
        role,
        ...days,
        duties,
        `₹${rate}`,
        `₹${amount.toLocaleString()}`
      ]]
    });
    await shareToWhatsApp(doc, `Duty_${name}`, summary);
  };

  const handlePrintOverallHistory = () => {
    if (filteredLogHistory.length === 0) return alert("No history records to print.");

    const tableBody = filteredLogHistory.slice().reverse().map((log: any, idx: number) => {
      const details = log.assignment_details || {};
      const name = details.labour_name || log.labour_name || log.worker_name || log.name || "-";
      const role = details.labour_type || log.category || log.labour_type || log.role || "-";
      const site = details.site_location || log.site_location || log.site_name || log.site || "-";
      const duties = log.total_duties !== undefined ? log.total_duties : (log.totalDuties || 0);
      const amount = log.total_amount !== undefined ? log.total_amount : (log.totalAmount || log.amount || 0);
      const rate = log.rate_per_duty || log.ratePerDuty || log.rate || 0;
      const week = log.week_starting || log.start_date || log.date || "N/A";

      return [
        idx + 1,
        name,
        role,
        site,
        week,
        duties,
        `₹${rate}`,
        `₹${Number(amount).toLocaleString()}`
      ];
    });

    const grandTotal = filteredLogHistory.reduce((sum: number, log: any) => {
      const amount = log.total_amount !== undefined ? log.total_amount : (log.totalAmount || log.amount || 0);
      return sum + Number(amount);
    }, 0);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Permanent Log History" : `Log History - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Labour Name", "Role", "Site", "Week Starting", "Duties", "Rate", "Amount"]],
      tableBody,
      tableFooter: ["TOTALS", "", "", "", "", "", "", `₹${grandTotal.toLocaleString()}`],
      filename: selectedSite === "All" ? "Log_History_Report" : `Log_History_${selectedSite}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppOverallHistory = async () => {
    if (filteredLogHistory.length === 0) return alert("No history records to share.");

    const tableBody = filteredLogHistory.slice().reverse().map((log: any, idx: number) => {
      const details = log.assignment_details || {};
      const name = details.labour_name || log.labour_name || log.worker_name || log.name || "-";
      const role = details.labour_type || log.category || log.labour_type || log.role || "-";
      const site = details.site_location || log.site_location || log.site_name || log.site || "-";
      const duties = log.total_duties !== undefined ? log.total_duties : (log.totalDuties || 0);
      const amount = log.total_amount !== undefined ? log.total_amount : (log.totalAmount || log.amount || 0);
      const rate = log.rate_per_duty || log.ratePerDuty || log.rate || 0;
      const week = log.week_starting || log.start_date || log.date || "N/A";

      return [
        idx + 1,
        name,
        role,
        site,
        week,
        duties,
        `₹${rate}`,
        `₹${Number(amount).toLocaleString()}`
      ];
    });

    const grandTotal = filteredLogHistory.reduce((sum: number, log: any) => {
      const amount = log.total_amount !== undefined ? log.total_amount : (log.totalAmount || log.amount || 0);
      return sum + Number(amount);
    }, 0);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Permanent Log History" : `Log History - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Labour Name", "Role", "Site", "Week Starting", "Duties", "Rate", "Amount"]],
      tableBody,
      tableFooter: ["TOTALS", "", "", "", "", "", "", `₹${grandTotal.toLocaleString()}`],
      filename: selectedSite === "All" ? "Log_History_Report" : `Log_History_${selectedSite}`
    });

    const summaryText = `*Permanent Log History Report*\n` +
      `*Site:* ${selectedSite === "All" ? "All Sites" : selectedSite}\n` +
      `*Total Records:* ${filteredLogHistory.length}\n` +
      `*Total Estimated Amount:* ₹${grandTotal.toLocaleString()}\n` +
      `*Date:* ${new Date().toLocaleDateString("en-GB")}`;

    await shareToWhatsApp(doc, selectedSite === "All" ? "Log_History_Report" : `Log_History_${selectedSite}`, summaryText);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-10 pb-20">
      <ActiveWorkforceSummary />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              Site Bill
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Workforce Settlement & Reporting</p>
          </div>

          <div className="h-12 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />

          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                <Filter className="w-3 h-3" /> View From
              </label>
              <input
                type="date"
                className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 shadow-inner cursor-pointer"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
              />
            </div>
            <div className="pt-4">
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                <Filter className="w-3 h-3" /> To
              </label>
              <input
                type="date"
                className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 shadow-inner cursor-pointer"
                value={weekEndDate}
                onChange={(e) => setWeekEndDate(e.target.value)}
              />
            </div>
          </div>
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
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Entry Details</h3>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-2">
              <Calendar className="w-3 h-3 text-indigo-500" /> Week Starting:
            </label>
            <input 
              type="date" 
              className="bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer"
              value={entryStartDate}
              onChange={(e) => setEntryStartDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 ml-1">
              <Hash className="w-3.5 h-3.5" /> Labour ID
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner outline-none"
                value={formData.labourId}
                onChange={e => setFormData(prev => ({ ...prev, labourId: e.target.value }))}
                placeholder="Labour (e.g. 001)"
              />
              {isFetchingAssignments && <Loader2 className="w-4 h-4 absolute right-4 top-4 animate-spin text-indigo-500" />}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <UserCircle className="w-3.5 h-3.5" /> Engineer / Contractor
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              value={formData.engineerName}
              onChange={e => setFormData(prev => ({ ...prev, engineerName: e.target.value }))}
              placeholder="Enter Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <MapPin className="w-3.5 h-3.5" /> Bill Site
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              value={formData.siteName}
              onChange={e => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
              placeholder="Enter Site"
            />
          </div>

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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <Briefcase className="w-3.5 h-3.5" /> Labour Name
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              value={formData.labourName}
              onChange={e => setFormData(prev => ({ ...prev, labourName: e.target.value }))}
              placeholder="Enter Full Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 ml-1">
              <TrendingUp className="w-3.5 h-3.5" /> Rate per Duty (₹)
            </label>
            <input
              type="number"
              className="w-full bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3.5 text-sm font-black text-emerald-600 dark:text-emerald-400 focus:ring-4 focus:ring-emerald-500/5 outline-none"
              value={formData.ratePerDuty || ""}
              onChange={e => setFormData(prev => ({ ...prev, ratePerDuty: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 800"
            />
          </div>
        </div>

        {/* Duty Log */}
        <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-3xl p-6 mb-8 border border-slate-100/50 dark:border-slate-800/50">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6 ml-1">
            <Calendar className="w-3.5 h-3.5" /> 7-Day Duty Log ({entryStartDate})
          </label>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {formData.days.map((day, idx) => (
              <div key={idx} className="space-y-2 text-center">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                  {entryWeekLabels[idx].label}
                  <span className="block text-indigo-500 text-[10px]">{entryWeekLabels[idx].date}</span>
                </span>
                <input
                  type="number"
                  step="0.5"
                  className="w-full bg-white dark:bg-slate-900 border-none rounded-xl p-3 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                  value={day || ""}
                  onChange={e => handleDayChange(idx, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-4">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 px-8 py-5 rounded-3xl border border-slate-100/50 dark:border-slate-700/30 flex flex-col items-center">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Duties</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{formData.totalDuties}</span>
            </div>
            <div className="bg-indigo-600 px-8 py-5 rounded-3xl shadow-xl shadow-indigo-600/20 flex flex-col items-center min-w-[180px]">
              <span className="block text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Estimated Amount</span>
              <span className="text-2xl font-black text-white">₹ {formData.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleAddRecord}
            className="w-full md:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add to Bill
          </button>
        </div>
      </div>

      {/* Current Session Bill */}
      {billRecords.length > 0 && (
        <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-slide-up">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Current Bill Summary 
            </h3>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 hover:text-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest border border-slate-100 dark:border-slate-700 shadow-sm"><Printer className="w-3.5 h-3.5" /> Full Print</button>
              <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest border border-emerald-100 shadow-sm"><Share2 className="w-3.5 h-3.5" /> Full WhatsApp</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Labour Detail</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duty Log</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {billRecords.map((record, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-black text-xs">
                          {record.category?.charAt(0) || "L"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{record.labourName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{record.category} • {record.labourId || 'No ID'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex justify-center gap-1">
                        {record.days.map((d, i) => (
                          <div key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black ${d > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                            {d}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className="font-black text-slate-800 dark:text-white text-sm">{record.totalDuties}</span>
                    </td>
                    <td className="p-6 text-right">
                      <p className="font-black text-slate-800 dark:text-white text-sm">₹{record.totalAmount.toLocaleString()}</p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase">@ ₹{record.ratePerDuty}</p>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handlePrintSingle(record)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors" title="Print Single"><Printer className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleWhatsAppSingle(record)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="WhatsApp Single"><Share2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeRecord(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-600">
                  <td colSpan={3} className="p-6">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Grand Settlement Total</span>
                  </td>
                  <td className="p-6 text-right">
                    <span className="text-xl font-black text-white">₹ {billRecords.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {billRecords.length > 0 && (
        <div className="flex justify-center">
          <button
            disabled={isSaving}
            onClick={handleSaveBill}
            className="group relative bg-indigo-600 disabled:bg-indigo-400 hover:bg-indigo-500 text-white px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 flex items-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Send className={`w-4 h-4 ${isSaving ? 'animate-bounce' : 'group-hover:translate-x-1 group-hover:-translate-y-1'} transition-transform`} />
            <span className="flex items-center gap-2">
              {isSaving ? "Syncing Logs..." : "Finalize & Save Weekly Logs"}
              {!isSaving && <CheckCircle2 className="w-3 h-3 opacity-50" />}
            </span>
          </button>
        </div>
      )}

      {/* Permanent Log History */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
        
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white flex items-center gap-3">
              <History className="w-4 h-4 text-indigo-500" /> Permanent Log History {selectedSite !== "All" ? `- ${selectedSite}` : ""}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">All-time stored workforce records</p>
          </div>
          <button onClick={fetchData} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all group border border-slate-100 dark:border-slate-700">
            <Loader2 className={`w-4 h-4 text-indigo-500 ${isFetchingHistory ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Labour Detail</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site & Engineer</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duty Log</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Estimate Amount</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogHistory.length > 0 ? (
                filteredLogHistory.slice().reverse().map((log, idx) => {
                  // Advanced nested field mapping based on backend JSON structure
                  const details = log.assignment_details || {};
                  
                  const name = details.labour_name || log.labour_name || log.worker_name || log.name || "-";
                  const id = details.labour_id || log.labour_id || log.labour_id_no || log.id_no || "N/A";
                  const role = details.labour_type || log.category || log.labour_type || log.role || "-";
                  const site = details.site_location || log.site_location || log.site_name || log.site || "-";
                  const eng = details.name || log.engineer_name || log.engineer || "-";
                  
                  const duties = log.total_duties !== undefined ? log.total_duties : (log.totalDuties || 0);
                  const amount = log.total_amount !== undefined ? log.total_amount : (log.totalAmount || log.amount || 0);
                  const rate = log.rate_per_duty || log.ratePerDuty || log.rate || 0;
                  const week = log.week_starting || log.start_date || log.date || "N/A";
                  
                  const rawDays = log.seven_day_duty_log || log.days_log || log.daysLog || log.days || [0,0,0,0,0,0,0];
                  const days = typeof rawDays === 'string' ? JSON.parse(rawDays) : rawDays;

                  return (
                    <tr key={log.id || idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-indigo-500 font-black text-xs border border-indigo-50 dark:border-indigo-900/30">
                            {String(role).charAt(0) || "L"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{role} • {id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{site}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-3 h-3 text-indigo-400" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{eng}</p>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex justify-center gap-1">
                          {Array.isArray(days) && days.map((d: number, i: number) => (
                            <div key={i} className={`w-4 h-4 rounded-md flex items-center justify-center text-[7px] font-black ${d > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                              {d}
                            </div>
                          ))}
                        </div>
                        <p className="text-[8px] font-black text-indigo-500 mt-2 uppercase tracking-tighter">Week: {week}</p>
                      </td>
                      <td className="p-6 text-center">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{duties}</span>
                      </td>
                      <td className="p-6 text-right">
                        <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{Number(amount).toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Rate: ₹{rate}</p>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handlePrintSingle(log)} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-700"><Printer className="w-4 h-4" /></button>
                          <button onClick={() => handleWhatsAppSingle(log)} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-400 hover:text-emerald-600 transition-all border border-slate-100 dark:border-slate-700"><Share2 className="w-4 h-4" /></button>
                          <button 
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-400 hover:text-rose-600 transition-all border border-slate-100 dark:border-slate-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                        <History className="w-8 h-8 text-slate-200" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">No Historical Records</p>
                        <p className="text-[10px] text-slate-300 mt-1">Start saving bills to see history</p>
                      </div>
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

export default PayOutTab;