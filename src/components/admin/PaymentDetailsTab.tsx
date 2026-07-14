import React, { useState, useEffect } from "react";
import { 
  UserCircle, 
  MapPin, 
  Layers, 
  Users, 
  Calculator, 
  CreditCard, 
  ArrowRightCircle, 
  Save, 
  Clock,
  Printer,
  Share2,
  Trash2,
  Plus,
  Hash,
  Briefcase,
  TrendingUp,
  History,
  Calendar,
  ChevronRight,
  Filter,
  Loader2,
  CheckCircle2,
  Send,
  Zap,
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

interface PaymentRecord {
  id?: string;
  labourId: string;
  engineerName: string;
  site: string;
  category: string;
  labourName: string;
  rate: number;
  days: number[]; // 7 days
  totalDuties: number;
  totalAmount: number;
  advance: number;
  netPayment: number;
  startDate: string;
  assignmentId?: number;
}

const PaymentDetailsTab: React.FC = () => {
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("All");

  // Extract unique site locations dynamically from payout history & assignments
  const uniqueSites = Array.from(
    new Set(
      (payoutHistory || [])
        .map((pay: any) => {
          const linkedAssignment = assignments.find(a => a.id === pay.assignment);
          return pay.site || linkedAssignment?.site_location;
        })
        .filter(Boolean)
    )
  );

  // Filter payout history based on selected site
  const filteredPayoutHistory = selectedSite === "All"
    ? (payoutHistory || [])
    : (payoutHistory || []).filter((pay: any) => {
        const linkedAssignment = assignments.find(a => a.id === pay.assignment);
        const siteName = pay.site || linkedAssignment?.site_location;
        return siteName === selectedSite;
      });

  const [weekStartDate, setWeekStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Default to last Sunday
    return d.toISOString().split('T')[0];
  });
  
  const [weekEndDate, setWeekEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 6);
    return d.toISOString().split('T')[0];
  });

  const [entryStartDate, setEntryStartDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState<PaymentRecord>({
    labourId: "",
    engineerName: "",
    site: "",
    category: "",
    labourName: "",
    rate: 0,
    days: [0, 0, 0, 0, 0, 0, 0],
    totalDuties: 0,
    totalAmount: 0,
    advance: 0,
    netPayment: 0,
    startDate: entryStartDate
  });

  const [billRecords, setBillRecords] = useState<PaymentRecord[]>([]);

  // Fetch all data on mount
  const handlePrintSingle = (record: any) => {
    const linkedAssignment = assignments.find(a => a.id === record.assignment);
    const name = record.labour_name || record.person_name || record.name || linkedAssignment?.labour_name || record.labourName || "-";
    const role = record.category || linkedAssignment?.labour_type || record.category || "-";
    const site = record.site || linkedAssignment?.site_location || record.site || "-";
    const eng = record.engineerName || linkedAssignment?.name || "-";
    const net = record.final_payout_amount || record.net_payment || record.netPayment || 0;
    const gross = record.total_amount || record.totalAmount || 0;
    const adv = record.advance_deduction || record.advance || 0;
    const rate = record.rate || linkedAssignment?.rate_per_duty || 0;
    const start = record.date || record.week_starting || record.startDate || "N/A";
    
    const rawDays = record.remarks || "[0,0,0,0,0,0,0]";
    const days = typeof rawDays === 'string' ? (rawDays.startsWith('[') ? JSON.parse(rawDays) : [0,0,0,0,0,0,0]) : rawDays;
    
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
        record.total_duty || record.totalDuties || 0,
        `₹${rate}`,
        `₹${gross.toLocaleString()}`
      ]],
      filename: `Duty_${name}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppSingle = async (record: any) => {
    const linkedAssignment = assignments.find(a => a.id === record.assignment);
    const name = record.labour_name || record.person_name || record.name || linkedAssignment?.labour_name || record.labourName || "-";
    const role = record.category || linkedAssignment?.labour_type || record.category || "-";
    const site = record.site || linkedAssignment?.site_location || record.site || "-";
    const net = record.final_payout_amount || record.net_payment || record.netPayment || 0;
    const start = record.date || record.week_starting || record.startDate || "N/A";
    const eng = record.engineerName || linkedAssignment?.name || "-";
    
    const summary = `*Duty Record - ${name}*\n*Site:* ${site}\n*Total Payout:* ₹${Number(net).toLocaleString()}`;
    
    const rawDays = record.remarks || "[0,0,0,0,0,0,0]";
    const days = typeof rawDays === 'string' ? (rawDays.startsWith('[') ? JSON.parse(rawDays) : [0,0,0,0,0,0,0]) : rawDays;
    const dayHeaders = getWeekLabels(start).map(l => `${l.label} ${l.date}`);
    const gross = record.total_amount || record.totalAmount || 0;
    const rate = record.rate || linkedAssignment?.rate_per_duty || 0;

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
        record.total_duty || record.totalDuties || 0,
        `₹${rate}`,
        `₹${gross.toLocaleString()}`
      ]]
    });
    await shareToWhatsApp(doc, `Duty_${name}`, summary);
  };

  const fetchAllData = async () => {
    try {
      setIsFetchingAssignments(true);
      setIsFetchingHistory(true);
      
      const [assignmentsRes, payoutRes, logs] = await Promise.all([
        axios.get(`${API_BASE}/workforce-assignments/`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        apiService.getPayouts(),
        apiService.getWeeklyLogs()
      ]);
      
      setAssignments(assignmentsRes.data);
      setPayoutHistory(payoutRes);
      setWeeklyLogs(logs);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsFetchingAssignments(false);
      setIsFetchingHistory(false);
    }
  };

  const handleDeletePayout = async (id: any) => {
    if (!window.confirm("Permanently delete this payout record from the cloud?")) return;
    try {
      await apiService.deleteWeeklyLog(id);
      alert("Payout record successfully deleted!");
      await fetchAllData();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete record.");
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Advanced Auto-fill logic when Labour ID is entered
  useEffect(() => {
    if (formData.labourId) {
      const labourIdLower = formData.labourId.toLowerCase();
      
      // 1. First, find registration data
      const assignmentMatch = assignments.find(a => String(a.labour_id).toLowerCase() === labourIdLower);
      
      // 2. Second, find the latest duty log for this worker
      const logMatch = weeklyLogs.slice().reverse().find(l => {
        const nestedId = l.assignment_details?.labour_id;
        return String(nestedId || l.labour_id).toLowerCase() === labourIdLower;
      });
      
      if (assignmentMatch || logMatch) {
        setFormData(prev => {
          const details = logMatch?.assignment_details || {};
          const rawDays = logMatch?.seven_day_duty_log || logMatch?.days_log || logMatch?.daysLog || logMatch?.days;
          let days = rawDays ? (typeof rawDays === 'string' ? JSON.parse(rawDays) : rawDays) : prev.days;
          
          if (!Array.isArray(days) || days.length === 0) {
            days = [0, 0, 0, 0, 0, 0, 0];
          } else if (days.length < 7) {
            days = [...days, ...Array(7 - days.length).fill(0)];
          } else if (days.length > 7) {
            days = days.slice(0, 7);
          }

          // If the days array contains only 0s but totalDuties is positive, distribute it!
          const totalD = logMatch?.total_duties || logMatch?.totalDuties || 0;
          if (days.every((d: any) => Number(d) === 0) && totalD > 0) {
            let tempTotal = totalD;
            days = Array(7).fill(0);
            for (let i = 0; i < 7 && tempTotal > 0; i++) {
              if (tempTotal >= 1) {
                days[i] = 1;
                tempTotal -= 1;
              } else {
                days[i] = tempTotal;
                tempTotal = 0;
              }
            }
            if (tempTotal > 0) {
              for (let i = 0; i < 7 && tempTotal > 0; i++) {
                if (tempTotal >= 1) {
                  days[i] += 1;
                  tempTotal -= 1;
                } else {
                  days[i] += tempTotal;
                  tempTotal = 0;
                }
              }
            }
          }

          return {
            ...prev,
            labourName: details.labour_name || assignmentMatch?.labour_name || logMatch?.labour_name || prev.labourName,
            category: details.labour_type || assignmentMatch?.labour_type || logMatch?.category || prev.category,
            engineerName: details.name || assignmentMatch?.name || logMatch?.engineer_name || prev.engineerName,
            site: details.site_location || assignmentMatch?.site_location || logMatch?.site_location || prev.site,
            assignmentId: assignmentMatch?.id || logMatch?.assignment,
            
            rate: logMatch?.rate_per_duty || logMatch?.rate || prev.rate,
            totalDuties: logMatch?.total_duties || prev.totalDuties,
            totalAmount: logMatch?.total_amount || prev.totalAmount,
            days: days,
            startDate: logMatch?.week_starting || logMatch?.start_date || prev.startDate
          };
        });
      }
    }
  }, [formData.labourId, assignments, weeklyLogs]);

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
    setFormData(prev => ({ ...prev, startDate: entryStartDate }));
  }, [entryStartDate]);

  // Recalculate Net Payment when wages or advance change
  useEffect(() => {
    // If we have days, recalculate totalDuties and totalAmount first
    const totalD = formData.days.reduce((a, b) => a + b, 0);
    const totalA = totalD > 0 ? (totalD * Number(formData.rate)) : formData.totalAmount;
    
    // Net payment is Wages - Advance
    const net = totalA - Number(formData.advance);
    
    setFormData(prev => ({
      ...prev,
      totalDuties: totalD > 0 ? totalD : prev.totalDuties,
      totalAmount: totalA,
      netPayment: net
    }));
  }, [formData.days, formData.rate, formData.advance, formData.totalAmount]);

  const handleDayChange = (index: number, value: string) => {
    const val = parseFloat(value) || 0;
    const newDays = [...formData.days];
    newDays[index] = val;
    setFormData(prev => ({ ...prev, days: newDays }));
  };

  const handleAddRecord = () => {
    if (!formData.labourName || !formData.site) return alert("Please fill in essential details.");
    
    setBillRecords(prev => [...prev, { 
      ...formData, 
      id: Math.random().toString(36).substr(2, 9) 
    }]);
    
    setFormData(prev => ({
      ...prev,
      labourId: "",
      labourName: "",
      days: [0, 0, 0, 0, 0, 0, 0],
      totalDuties: 0,
      totalAmount: 0,
      advance: 0,
      netPayment: 0
    }));
  };

  const handleSaveBill = async () => {
    if (billRecords.length === 0) return alert("No records to save.");

    try {
      setIsSaving(true);
      const promises = billRecords.map(async (record) => {
        // Final check to ensure we have a numeric ID
        let finalId = record.assignmentId;
        
        if (!finalId) {
          const match = assignments.find(a => String(a.labour_id).toLowerCase() === String(record.labourId).toLowerCase());
          finalId = match?.id;
        }

        if (!finalId) {
          throw new Error(`Worker ID not found for ${record.labourName}. Please enter a valid Labour ID.`);
        }

        const payload = {
          person_name: record.labourName,
          site: record.site,
          worker: Number(finalId), // Force numeric ID
          category: record.category,
          total_duty: record.totalDuties,
          rate: record.rate,
          total_amount: record.totalAmount,
          advance_deduction: record.advance,
          net_payment: record.netPayment,
          date: record.startDate || entryStartDate,
          remarks: JSON.stringify(record.days),
          assignment: Number(finalId) // Force numeric ID
        };

        return apiService.createPayout(payload);
      });

      await Promise.all(promises);
      setBillRecords([]);
      await fetchAllData();
      alert("All Payout Records saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save some records. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeRecord = (id: string) => {
    setBillRecords(prev => prev.filter(r => r.id !== id));
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

  const entryWeekLabels = getWeekLabels(formData.startDate || entryStartDate);

  const generateReportData = () => {
    const tableBody = billRecords.map(record => [
      record.labourName,
      record.category,
      record.totalDuties,
      `₹${record.rate}`,
      `₹${record.totalAmount.toLocaleString()}`,
      `₹${record.advance.toLocaleString()}`,
      `₹${record.netPayment.toLocaleString()}`
    ]);

    const grandTotal = billRecords.reduce((sum, r) => sum + r.netPayment, 0);
    const site = billRecords[0]?.site || formData.site || "N/A";

    return {
      title: "Workforce Payment Settlement",
      engineer: billRecords[0]?.engineerName || formData.engineerName || "N/A",
      site,
      period: `Period: ${weekStartDate} to ${weekEndDate}`,
      tableHead: [["Labour Name", "Role", "Duties", "Rate", "Wages", "Advance", "Net Pay"]],
      tableBody,
      tableFooter: ["GRAND TOTAL", "", "", "", "", "", `₹${grandTotal.toLocaleString()}`]
    };
  };

  const handlePrint = () => {
    const data = generateReportData();
    if (data.tableBody.length === 0) return alert("Please add records first.");
    const doc = generateProfessionalPDF(data);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsApp = async () => {
    const data = generateReportData();
    if (data.tableBody.length === 0) return alert("Please add records first.");
    const doc = generateProfessionalPDF(data);
    const grandTotal = billRecords.reduce((sum, r) => sum + r.netPayment, 0);
    const summary = `*Payment Settlement - ${data.site}*\n*Period:* ${weekStartDate} to ${weekEndDate}\n*Grand Total: ₹${grandTotal.toLocaleString()}*`;
    await shareToWhatsApp(doc, `Payout_${data.site}`, summary);
  };

  const handlePrintOverallHistory = () => {
    if (filteredPayoutHistory.length === 0) return alert("No payout history records to print.");

    const tableBody = filteredPayoutHistory.slice().reverse().map((pay: any, idx: number) => {
      const name = pay.labour_name || pay.person_name || pay.name || "-";
      const net = pay.final_payout_amount || pay.net_payment || pay.amount || 0;
      const date = pay.date || pay.week_starting || pay.startDate || "N/A";
      const linkedAssignment = assignments.find(a => a.id === pay.assignment);
      const site = pay.site || linkedAssignment?.site_location || "-";
      const role = pay.category || linkedAssignment?.labour_type || "-";
      const duties = pay.total_duty || pay.totalDuties || 0;
      const rate = pay.rate || linkedAssignment?.rate_per_duty || 0;

      return [
        idx + 1,
        name,
        role,
        site,
        date,
        duties,
        `₹${rate}`,
        `₹${Number(net).toLocaleString()}`
      ];
    });

    const grandTotal = filteredPayoutHistory.reduce((sum: number, pay: any) => {
      const net = pay.final_payout_amount || pay.net_payment || pay.amount || 0;
      return sum + Number(net);
    }, 0);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Payout Settlements" : `Payout Settlements - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Labour Name", "Role", "Site", "Settlement Date", "Duties", "Rate", "Net Payment"]],
      tableBody,
      tableFooter: ["TOTALS", "", "", "", "", "", "", `₹${grandTotal.toLocaleString()}`],
      filename: selectedSite === "All" ? "Payout_Settlements_Report" : `Payout_Settlements_${selectedSite}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppOverallHistory = async () => {
    if (filteredPayoutHistory.length === 0) return alert("No payout history records to share.");

    const tableBody = filteredPayoutHistory.slice().reverse().map((pay: any, idx: number) => {
      const name = pay.labour_name || pay.person_name || pay.name || "-";
      const net = pay.final_payout_amount || pay.net_payment || pay.amount || 0;
      const date = pay.date || pay.week_starting || pay.startDate || "N/A";
      const linkedAssignment = assignments.find(a => a.id === pay.assignment);
      const site = pay.site || linkedAssignment?.site_location || "-";
      const role = pay.category || linkedAssignment?.labour_type || "-";
      const duties = pay.total_duty || pay.totalDuties || 0;
      const rate = pay.rate || linkedAssignment?.rate_per_duty || 0;

      return [
        idx + 1,
        name,
        role,
        site,
        date,
        duties,
        `₹${rate}`,
        `₹${Number(net).toLocaleString()}`
      ];
    });

    const grandTotal = filteredPayoutHistory.reduce((sum: number, pay: any) => {
      const net = pay.final_payout_amount || pay.net_payment || pay.amount || 0;
      return sum + Number(net);
    }, 0);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Payout Settlements" : `Payout Settlements - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Labour Name", "Role", "Site", "Settlement Date", "Duties", "Rate", "Net Payment"]],
      tableBody,
      tableFooter: ["TOTALS", "", "", "", "", "", "", `₹${grandTotal.toLocaleString()}`],
      filename: selectedSite === "All" ? "Payout_Settlements_Report" : `Payout_Settlements_${selectedSite}`
    });

    const summaryText = `*Payout Settlements Report*\n` +
      `*Site:* ${selectedSite === "All" ? "All Sites" : selectedSite}\n` +
      `*Total Settlements:* ${filteredPayoutHistory.length}\n` +
      `*Total Estimated Payout:* ₹${grandTotal.toLocaleString()}\n` +
      `*Date:* ${new Date().toLocaleDateString("en-GB")}`;

    await shareToWhatsApp(doc, selectedSite === "All" ? "Payout_Settlements_Report" : `Payout_Settlements_${selectedSite}`, summaryText);
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
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              Pay Out Details
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Cross-referencing logs with final settlements</p>
          </div>

          <div className="h-12 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />

          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">History From</label>
              <input
                type="date"
                className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
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

          {/* Total Value Block */}
          <div className="bg-indigo-50 dark:bg-indigo-500/10 px-6 py-2.5 rounded-2xl flex items-center gap-4 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Total Payout</p>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹ {filteredPayoutHistory.reduce((sum: number, pay: any) => {
                const net = pay.final_payout_amount || pay.net_payment || pay.amount || 0;
                return sum + Number(net);
              }, 0).toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20 relative">
        <div className="absolute top-4 right-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Log-Sync Active</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Payment Entry</h3>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-2">
              <Calendar className="w-3 h-3 text-indigo-500" /> Week Starting:
            </label>
            <input 
              type="date" 
              className="bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-1.5 text-xs font-bold text-slate-800 dark:text-white cursor-pointer shadow-sm"
              value={entryStartDate}
              onChange={(e) => setEntryStartDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Labour ID */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 ml-1">
              <Hash className="w-3.5 h-3.5" /> Labour ID
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                value={formData.labourId}
                onChange={e => setFormData(prev => ({ ...prev, labourId: e.target.value }))}
                placeholder="Enter ID (e.g. 001)"
              />
              {(isFetchingAssignments || isFetchingHistory) && <Loader2 className="w-4 h-4 absolute right-4 top-4 animate-spin text-indigo-500" />}
              <Zap className="w-3 h-3 absolute right-12 top-5 text-amber-500" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <UserCircle className="w-3.5 h-3.5" /> Labour Name
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white shadow-inner"
              value={formData.labourName}
              onChange={e => setFormData(prev => ({ ...prev, labourName: e.target.value }))}
              placeholder="Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <MapPin className="w-3.5 h-3.5" /> Site
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white shadow-inner"
              value={formData.site}
              onChange={e => setFormData(prev => ({ ...prev, site: e.target.value }))}
              placeholder="Site"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <Briefcase className="w-3.5 h-3.5" /> Category
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-bold text-slate-800 dark:text-white shadow-inner"
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Role"
            />
          </div>
        </div>

        {/* Dynamic Log Data Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
           {/* Interactive 7-Day Duty Log Input */}
          <div className="bg-indigo-50/30 dark:bg-slate-800/40 rounded-3xl p-6 border border-indigo-100/50 dark:border-slate-800/50">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2 mb-4">
              <Calendar className="w-3.5 h-3.5" /> 7-Day Duty Log ({formData.startDate})
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
            <div className="mt-6 flex justify-between items-center px-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">Total Logged Duties</span>
               <span className="text-sm font-black text-indigo-600">{formData.totalDuties}</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Rate per Duty</label>
                <input
                  type="number"
                  className="w-full bg-white dark:bg-slate-900 border-none rounded-xl p-4 text-sm font-black text-indigo-600 shadow-sm"
                  value={formData.rate || ""}
                  onChange={e => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Wages</label>
                <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-sm font-black text-slate-600 border border-slate-100 dark:border-slate-800 shadow-inner">
                  ₹ {formData.totalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" /> Advance Amount to Deduct (₹)
              </label>
              <input
                type="number"
                className="w-full bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 text-lg font-black text-rose-600 shadow-lg focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                value={formData.advance || ""}
                onChange={e => setFormData(prev => ({ ...prev, advance: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter Amount"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly Gross</p>
                <p className="text-xl font-black text-slate-800 dark:text-white">₹ {formData.totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Deduction</p>
                <p className="text-xl font-black text-rose-600">₹ {Number(formData.advance).toLocaleString()}</p>
              </div>
              <div className="p-5 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/30 min-w-[200px] text-center">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Final Net Payable</p>
                <p className="text-2xl font-black text-white">₹ {formData.netPayment.toLocaleString()}</p>
              </div>
           </div>

          <button
            onClick={handleAddRecord}
            className="w-full md:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Settlement
          </button>
        </div>
      </div>

      {/* Bill Records Table */}
      {billRecords.length > 0 && (
        <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-slide-up">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Current Payout List 
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
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duties</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Wages</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Advance</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Payment</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {billRecords.map((record) => (
                  <tr key={record.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
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
                    <td className="p-6 text-center font-black text-slate-800 dark:text-white text-sm">
                      {record.totalDuties}
                    </td>
                    <td className="p-6 text-right font-black text-slate-800 dark:text-white text-sm">
                      ₹{record.totalAmount.toLocaleString()}
                    </td>
                    <td className="p-6 text-right font-black text-rose-500 text-sm">
                      ₹{record.advance.toLocaleString()}
                    </td>
                    <td className="p-6 text-right">
                      <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 px-4 py-2 rounded-xl font-black text-sm border border-emerald-100 dark:border-emerald-500/20">
                        ₹{record.netPayment.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handlePrintSingle(record)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors" title="Print Single"><Printer className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleWhatsAppSingle(record)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="WhatsApp Single"><Share2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeRecord(record.id!)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
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
              {isSaving ? "Syncing Payouts..." : "Save All Settlements"}
              {!isSaving && <CheckCircle2 className="w-3 h-3 opacity-50" />}
            </span>
          </button>
        </div>
      )}

      {/* Payout History Table */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-emerald-500 to-rose-500" />
        
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white flex items-center gap-3">
              <History className="w-4 h-4 text-indigo-500" /> Payout History {selectedSite !== "All" ? `- ${selectedSite}` : ""}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">All-time stored payment settlements</p>
          </div>
          <button onClick={fetchAllData} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all group border border-slate-100 dark:border-slate-700">
            <Loader2 className={`w-4 h-4 text-indigo-500 ${isFetchingHistory ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Labour Detail</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Context</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duty Log</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Settlement Date</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Payment</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayoutHistory.length > 0 ? (
                filteredPayoutHistory.slice().reverse().map((pay, idx) => {
                  // Advanced mapping for Payout records
                  const name = pay.labour_name || pay.person_name || pay.name || "-";
                  const net = pay.final_payout_amount || pay.net_payment || pay.amount || 0;
                  const gross = pay.total_amount || 0;
                  const date = pay.date || pay.week_starting || pay.startDate || "N/A";
                  
                  // Link back to assignment for site/category if missing
                  const linkedAssignment = assignments.find(a => a.id === pay.assignment);
                  const site = pay.site || linkedAssignment?.site_location || "-";
                  const role = pay.category || linkedAssignment?.labour_type || "-";
                  const id = pay.labour_id || linkedAssignment?.labour_id || "N/A";
                  const rate = pay.rate || linkedAssignment?.rate_per_duty || 0;

                  // Parse duty log from remarks
                  const rawDays = pay.remarks || "[0,0,0,0,0,0,0]";
                  const days = typeof rawDays === 'string' ? (rawDays.startsWith('[') ? JSON.parse(rawDays) : [0,0,0,0,0,0,0]) : rawDays;

                  return (
                    <tr key={pay.id || idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
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
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{site}</p>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex justify-center gap-1">
                          {Array.isArray(days) && days.map((d: number, i: number) => (
                            <div key={i} className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[6px] font-black ${d > 0 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                              {d}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-tighter italic">
                          {date}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{Number(net).toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Rate: ₹{rate}</p>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handlePrintSingle(pay)} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-700"><Printer className="w-4 h-4" /></button>
                          <button onClick={() => handleWhatsAppSingle(pay)} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-400 hover:text-emerald-600 transition-all border border-slate-100 dark:border-slate-700"><Share2 className="w-4 h-4" /></button>
                          <button 
                            onClick={() => handleDeletePayout(pay.id)}
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
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">No Payout History</p>
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

export default PaymentDetailsTab;
